import { Client, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS } from '../utils/embeds';
import {
  formatDateKey,
  formatDuration,
  isMonday,
  lastWeekDateKeys,
  nextMidnight,
  toDateKey,
  yesterdayDateKey,
} from '../utils/time';
import { getSettings, saveStore, updateSettings } from './screenShareStore';
import { flushSessions } from './screenShareTracker';
import { formatRankLines, rankByDays } from './ranking';

/**
 * 한국 시간 자정마다 "어제의 결산"을 지정 채널에 올린다.
 * 월요일 자정에는 "지난주 결산"도 함께 올린다.
 *
 * 외부 스케줄러 패키지(node-cron 등) 없이 setTimeout 만으로 동작한다.
 * 매번 다음 자정을 새로 계산하므로 시간이 밀리지 않는다.
 */

/** 자정 직후 진행 중인 세션이 정리될 시간을 조금 준다. */
const POST_DELAY_MS = 5_000;

let timer: NodeJS.Timeout | null = null;

/** 어제 결산 임베드 */
export function buildDailyReport(guildId: string, nowMs: number): EmbedBuilder | null {
  const dateKey = yesterdayDateKey(nowMs);
  const rows = rankByDays(guildId, [dateKey], false, nowMs);

  if (rows.length === 0) return null; // 아무도 안 했으면 공지하지 않는다

  const totalMs = rows.reduce((sum, row) => sum + row.ms, 0);

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🏆 ${formatDateKey(dateKey)} 화면공유 결산`)
    .setDescription(formatRankLines(rows, formatDuration))
    .addFields(
      { name: '참여 인원', value: `${rows.length}명`, inline: true },
      { name: '총 시간', value: formatDuration(totalMs), inline: true },
    )
    .setFooter({ text: '기준: 한국 시간 자정' })
    .setTimestamp();
}

/** 지난주 결산 임베드 */
export function buildWeeklyReport(guildId: string, nowMs: number): EmbedBuilder | null {
  const dateKeys = lastWeekDateKeys(nowMs);
  const rows = rankByDays(guildId, dateKeys, false, nowMs);

  if (rows.length === 0) return null;

  const totalMs = rows.reduce((sum, row) => sum + row.ms, 0);
  const period = `${formatDateKey(dateKeys[0])} ~ ${formatDateKey(dateKeys[6])}`;

  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('📅 지난주 화면공유 결산')
    .setDescription(`**${period}**\n\n${formatRankLines(rows, formatDuration)}`)
    .addFields(
      { name: '참여 인원', value: `${rows.length}명`, inline: true },
      { name: '총 시간', value: formatDuration(totalMs), inline: true },
    )
    .setTimestamp();
}

/** 설정된 채널로 임베드를 보낸다. 실패해도 봇이 죽지 않도록 로그만 남긴다. */
async function sendToReportChannel(
  client: Client,
  guildId: string,
  channelId: string,
  embeds: EmbedBuilder[],
): Promise<boolean> {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      console.warn(`[report] ${guildId}: 결산 채널을 찾을 수 없어 건너뜁니다.`);
      return false;
    }

    const me = channel.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;

    if (
      !permissions?.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
      console.warn(`[report] ${guildId}: 결산 채널에 메시지 보내기 권한이 없습니다.`);
      return false;
    }

    await channel.send({ embeds });
    return true;
  } catch (error) {
    console.error(`[report] ${guildId}: 결산 전송 실패`, error);
    return false;
  }
}

/** 실제 결산 실행. 테스트에서 직접 호출할 수 있게 export 한다. */
export async function runReports(client: Client, nowMs: number = Date.now()): Promise<void> {
  // 자정을 넘긴 진행 중 세션을 먼저 정리해야 어제 몫이 어제로 기록된다.
  flushSessions(nowMs);
  saveStore(true);

  const todayKey = toDateKey(nowMs);

  for (const guild of client.guilds.cache.values()) {
    const settings = getSettings(guild.id);
    if (!settings.reportChannelId) continue;

    // 노트북이 절전에서 깨어나며 늦게 실행돼도 같은 날 두 번 보내지 않는다.
    if (settings.lastDailyReport === todayKey) continue;

    const embeds: EmbedBuilder[] = [];

    const daily = buildDailyReport(guild.id, nowMs);
    if (daily) embeds.push(daily);

    const isNewWeek = isMonday(nowMs) && settings.lastWeeklyReport !== todayKey;
    const weekly = isNewWeek ? buildWeeklyReport(guild.id, nowMs) : null;
    if (weekly) embeds.push(weekly);

    if (embeds.length === 0) {
      // 기록이 없어도 "오늘은 처리했다"고 표시해 둔다.
      updateSettings(guild.id, { lastDailyReport: todayKey });
      continue;
    }

    const sent = await sendToReportChannel(
      client,
      guild.id,
      settings.reportChannelId,
      embeds,
    );

    if (sent) {
      updateSettings(guild.id, {
        lastDailyReport: todayKey,
        ...(isNewWeek ? { lastWeeklyReport: todayKey } : {}),
      });
      console.log(`📮 [report] ${guild.name}: 결산 전송 완료`);
    }
  }

  saveStore(true);
}

/** 다음 자정에 실행되도록 예약 (실행 후 다시 예약) */
function scheduleNext(client: Client): void {
  const now = Date.now();
  const target = nextMidnight(now) + POST_DELAY_MS;

  timer = setTimeout(() => {
    void runReports(client)
      .catch((error) => console.error('[report] 실행 실패', error))
      .finally(() => scheduleNext(client));
  }, target - now);

  timer.unref();

  console.log(`⏰ 다음 결산 예정: ${new Date(target).toLocaleString('ko-KR')}`);
}

export function startReportScheduler(client: Client): void {
  if (timer) return;
  scheduleNext(client);
}

export function stopReportScheduler(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}
