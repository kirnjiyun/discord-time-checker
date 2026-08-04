import { getGuildRecords, sumDays } from './screenShareStore';
import { getPendingMs } from './screenShareTracker';

/** 랭킹 한 줄 */
export interface RankRow {
  userId: string;
  ms: number;
}

/**
 * 날짜 키 목록 기준 랭킹.
 *
 * includePending: 아직 저장되지 않은 "진행 중인 세션" 시간을 더할지 여부.
 * 오늘/이번주 조회에는 true, 어제/지난주 결산에는 false 를 써야 한다.
 * (진행 중인 시간은 오늘에 속하므로 과거 집계에 더하면 안 됨)
 */
export function rankByDays(
  guildId: string,
  dateKeys: string[],
  includePending: boolean,
  nowMs: number = Date.now(),
): RankRow[] {
  return getGuildRecords(guildId)
    .map(({ userId, record }) => ({
      userId,
      ms:
        sumDays(record, dateKeys) +
        (includePending ? getPendingMs(guildId, userId, nowMs) : 0),
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
}

/** 전체 누적 기준 랭킹 */
export function rankByTotal(guildId: string, nowMs: number = Date.now()): RankRow[] {
  return getGuildRecords(guildId)
    .map(({ userId, record }) => ({
      userId,
      ms: record.totalMs + getPendingMs(guildId, userId, nowMs),
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** 랭킹 목록을 임베드 본문 문자열로 변환 */
export function formatRankLines(
  rows: RankRow[],
  formatMs: (ms: number) => string,
  limit = 10,
): string {
  return rows
    .slice(0, limit)
    .map((row, index) => {
      const rank = MEDALS[index] ?? `\`${index + 1}.\``;
      return `${rank} <@${row.userId}> — **${formatMs(row.ms)}**`;
    })
    .join('\n');
}
