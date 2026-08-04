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
import { getRules, getSettings, saveStore, updateSettings } from './screenShareStore';
import { flushSessions } from './screenShareTracker';
import { formatRankLines, rankByDays } from './ranking';
import {
  DailySettlementRow,
  countAttendedDays,
  isAttended,
  settleDaily,
  settleWeeklyWarnings,
} from './attendance';
import { getUserRecord } from './screenShareStore';

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

/**
 * 어제 결산 임베드.
 *
 * settle=true 면 출석 인정자의 누적 출석일을 실제로 증가시킨다.
 * 미리보기(/report test)에서는 false 로 호출해 부작용이 없게 한다.
 */
export function buildDailyReport(
  guildId: string,
  nowMs: number,
  settle = false,
): EmbedBuilder | null {
  const dateKey = yesterdayDateKey(nowMs);
  const rules = getRules(guildId);

  let rows: DailySettlementRow[];

  if (settle) {
    rows = settleDaily(guildId, dateKey);
  } else {
    rows = rankByDays(guildId, [dateKey], false, nowMs).map((row) => ({
      userId: row.userId,
      ms: row.ms,
      attended: isAttended(
        getUserRecord(guildId, row.userId),
        dateKey,
        rules.attendanceThresholdMinutes,
      ),
    }));
  }

  if (rows.length === 0) return null; // 아무도 안 했으면 공지하지 않는다

  const totalMs = rows.reduce((sum, row) => sum + row.ms, 0);

  // 스터디 규칙이 켜져 있으면 출석 인정 여부(⭕️/❌)를 함께 표시한다.
  const lines = rows
    .slice(0, 10)
    .map((row, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] ?? `\`${index + 1}.\``;
      const mark = rules.enabled ? (row.attended ? ' ⭕️' : ' ❌') : '';
      return `${medal} <@${row.userId}> — **${formatDuration(row.ms)}**${mark}`;
    })
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🏆 ${formatDateKey(dateKey)} 화면공유 결산`)
    .setDescription(lines)
    .addFields(
      { name: '참여 인원', value: `${rows.length}명`, inline: true },
      { name: '총 시간', value: formatDuration(totalMs), inline: true },
    )
    .setFooter({ text: '기준: 한국 시간 자정' })
    .setTimestamp();

  if (rules.enabled) {
    const attendedCount = rows.filter((row) => row.attended).length;
    embed.addFields({
      name: `출석 (${rules.attendanceThresholdMinutes}분 이상)`,
      value: `${attendedCount}명 ⭕️`,
      inline: true,
    });
  }

  return embed;
}

/**
 * 지난주 출석 미달자 경고 임베드.
 *
 * settle=true 면 실제로 경고를 부여한다.
 */
export function buildWeeklyWarningReport(
  guildId: string,
  nowMs: number,
  settle = false,
): EmbedBuilder | null {
  const rules = getRules(guildId);
  if (!rules.enabled) return null;

  const dateKeys = lastWeekDateKeys(nowMs);

  // 미리보기에서는 경고를 부여하지 않고 대상만 계산한다.
  const rows = settle
    ? settleWeeklyWarnings(guildId, nowMs)
    : rankByDays(guildId, dateKeys, false, nowMs).map((row) => {
        const record = getUserRecord(guildId, row.userId);
        const attendedDays = countAttendedDays(
          record,
          dateKeys,
          rules.attendanceThresholdMinutes,
        );
        const warnings = (record.warnings ?? 0) + 1;
        return {
          userId: row.userId,
          attendedDays,
          warnings,
          kickCandidate: warnings >= rules.maxWarningsBeforeKick,
        };
      }).filter((row) => row.attendedDays < rules.weeklyRequiredDays);

  if (rows.length === 0) return null;

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⚠️ 지난주 출석 기준 미달')
    .setDescription(
      `기준: 주 **${rules.weeklyRequiredDays}일** 이상 (하루 ${rules.attendanceThresholdMinutes}분 이상)\n\n` +
        rows
          .map(
            (row) =>
              `<@${row.userId}> — 출석 ${row.attendedDays}일 · 누적 경고 **${row.warnings}회**` +
              (row.kickCandidate ? ' 🚨' : ''),
          )
          .join('\n'),
    )
    .setTimestamp();

  const candidates = rows.filter((row) => row.kickCandidate);
  if (candidates.length > 0) {
    embed.addFields({
      name: `🚨 강퇴 검토 대상 (경고 ${rules.maxWarningsBeforeKick}회 이상)`,
      value:
        `${candidates.map((row) => `<@${row.userId}>`).join(', ')}\n` +
        '봇은 강퇴하지 않습니다. 관리자가 직접 판단해 주세요.\n' +
        '봐주기로 했다면 `/warning reset` 으로 경고를 초기화할 수 있어요.',
    });
  }

  return embed;
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

    // settle=true — 출석 인정자의 누적 출석일을 실제로 올린다.
    const daily = buildDailyReport(guild.id, nowMs, true);
    if (daily) embeds.push(daily);

    const isNewWeek = isMonday(nowMs) && settings.lastWeeklyReport !== todayKey;
    const weekly = isNewWeek ? buildWeeklyReport(guild.id, nowMs) : null;
    if (weekly) embeds.push(weekly);

    // 주간 경고는 월요일 자정, 일일 정산이 끝난 뒤에 처리한다.
    // (Java 버전은 일요일 23:55 에 돌아서 일요일 공부가 반영되지 않는 문제가 있었다)
    const shouldWarn =
      getRules(guild.id).enabled &&
      isMonday(nowMs) &&
      settings.lastWeeklyWarning !== todayKey;

    const warning = shouldWarn ? buildWeeklyWarningReport(guild.id, nowMs, true) : null;
    if (warning) embeds.push(warning);

    // 정산(누적 출석일 증가, 경고 부여)은 위에서 이미 실행됐다.
    // 전송 성공 여부와 무관하게 "처리했다"고 먼저 기록해야
    // 재시도 시 출석일과 경고가 두 번 올라가지 않는다.
    updateSettings(guild.id, {
      lastDailyReport: todayKey,
      ...(isNewWeek ? { lastWeeklyReport: todayKey } : {}),
      ...(shouldWarn ? { lastWeeklyWarning: todayKey } : {}),
    });

    if (embeds.length === 0) continue;

    const sent = await sendToReportChannel(
      client,
      guild.id,
      settings.reportChannelId,
      embeds,
    );

    if (sent) {
      console.log(`📮 [report] ${guild.name}: 결산 전송 완료`);
    } else {
      console.warn(`[report] ${guild.name}: 정산은 완료했지만 전송에 실패했습니다.`);
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
