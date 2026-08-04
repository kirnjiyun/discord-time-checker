import { Client, PermissionFlagsBits, VoiceState } from 'discord.js';
import { getRules, getSettings } from './screenShareStore';
import { getActiveSession } from './screenShareTracker';

/**
 * 스터디 채널에 들어와 놓고 화면공유를 켜지 않는 사람에게 경고 메시지를 보낸다.
 *
 * Java 버전(GracePeriodScheduler)과 동일한 규칙:
 * - 스터디 채널 입장 시 유예 타이머 시작
 * - 화면공유 중이면 검사 건너뜀
 * - 화면공유를 끄면 그 시점부터 유예 타이머를 다시 시작
 * - 한 번 경고한 뒤에는 같은 대기 구간에서 다시 경고하지 않음
 */

/** 검사 주기. Java 는 3분이었지만 더 촘촘히 봐도 부담이 없다. */
const CHECK_INTERVAL_MS = 30_000;

interface WaitingUser {
  guildId: string;
  userId: string;
  /** 유예 타이머 시작 시각 */
  since: number;
  /** 이미 경고를 보냈는지 */
  warned: boolean;
}

const waiting = new Map<string, WaitingUser>();
let timer: NodeJS.Timeout | null = null;
let client: Client | null = null;

const keyOf = (guildId: string, userId: string) => `${guildId}:${userId}`;

/** 유예 타이머 시작 (또는 재시작) */
function startWaiting(guildId: string, userId: string, at: number): void {
  waiting.set(keyOf(guildId, userId), { guildId, userId, since: at, warned: false });
}

function stopWaiting(guildId: string, userId: string): void {
  waiting.delete(keyOf(guildId, userId));
}

/**
 * voiceStateUpdate 에서 호출된다.
 * 화면공유 집계와 별개로, "스터디 채널에 있는가"를 따로 추적한다.
 */
export function handleVoiceUpdate(
  oldState: VoiceState,
  newState: VoiceState,
  at: number = Date.now(),
): void {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const guildId = newState.guild.id;
  const userId = member.id;
  const rules = getRules(guildId);

  if (!rules.enabled || !rules.studyChannelId) {
    stopWaiting(guildId, userId);
    return;
  }

  const wasInStudy = oldState.channelId === rules.studyChannelId;
  const isInStudy = newState.channelId === rules.studyChannelId;

  // 스터디 채널을 나갔다면 감시 대상에서 제외
  if (wasInStudy && !isInStudy) {
    stopWaiting(guildId, userId);
    return;
  }

  // 스터디 채널에 새로 들어왔다면 유예 타이머 시작
  if (!wasInStudy && isInStudy) {
    startWaiting(guildId, userId, at);
    return;
  }

  if (!isInStudy) return;

  // 채널 안에 머무는 중 — 화면공유를 껐다면 유예 타이머를 다시 시작한다.
  const wasStreaming = oldState.streaming === true;
  const isStreaming = newState.streaming === true;

  if (wasStreaming && !isStreaming) {
    startWaiting(guildId, userId, at);
  }
}

/** 봇 재시작 시, 이미 스터디 채널에 있는 사람들을 감시 목록에 넣는다. */
export function resumeWaiting(readyClient: Client<true>, at: number = Date.now()): number {
  let count = 0;

  for (const guild of readyClient.guilds.cache.values()) {
    const rules = getRules(guild.id);
    if (!rules.enabled || !rules.studyChannelId) continue;

    for (const voiceState of guild.voiceStates.cache.values()) {
      if (voiceState.channelId !== rules.studyChannelId) continue;
      if (voiceState.member?.user.bot) continue;

      startWaiting(guild.id, voiceState.id, at);
      count += 1;
    }
  }

  return count;
}

/** 경고 메시지를 보낼 채널을 결정한다. (알림 채널 > 결산 채널) */
async function resolveNotifyChannel(guildId: string) {
  if (!client) return null;

  const rules = getRules(guildId);
  const channelId = rules.notifyChannelId ?? getSettings(guildId).reportChannelId;
  if (!channelId) return null;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return null;

    const me = channel.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;
    if (!permissions?.has(PermissionFlagsBits.SendMessages)) return null;

    return channel;
  } catch {
    return null;
  }
}

/** 주기 검사 — 유예시간이 지난 사람에게 경고를 보낸다. */
export async function checkGracePeriod(at: number = Date.now()): Promise<void> {
  for (const entry of [...waiting.values()]) {
    if (entry.warned) continue;

    const rules = getRules(entry.guildId);
    if (!rules.enabled || !rules.studyChannelId) {
      stopWaiting(entry.guildId, entry.userId);
      continue;
    }

    // 화면공유 중이면 검사하지 않는다.
    if (getActiveSession(entry.guildId, entry.userId)) continue;

    const elapsedMinutes = (at - entry.since) / 60_000;
    if (elapsedMinutes < rules.gracePeriodMinutes) continue;

    entry.warned = true; // 먼저 표시해 중복 전송을 막는다

    const channel = await resolveNotifyChannel(entry.guildId);
    if (!channel) continue;

    try {
      await channel.send(
        `<@${entry.userId}> 스터디 채널에 들어온 지 ${rules.gracePeriodMinutes}분이 지났어요. ` +
          '화면 공유를 켜주세요! 🖥️',
      );
    } catch (error) {
      console.error('[grace] 경고 전송 실패', error);
    }
  }
}

export function startGraceWatcher(readyClient: Client): void {
  client = readyClient;
  if (timer) return;

  timer = setInterval(() => {
    void checkGracePeriod().catch((error) => console.error('[grace] 검사 실패', error));
  }, CHECK_INTERVAL_MS);
  timer.unref();
}

export function stopGraceWatcher(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** 테스트용 */
export function __resetForTest(): void {
  waiting.clear();
  client = null;
}

/** 테스트용 — 현재 감시 중인 대기자 */
export function __getWaiting(): WaitingUser[] {
  return [...waiting.values()];
}
