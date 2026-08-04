import {
  addAttendanceDay,
  addWarning,
  getGuildRecords,
  getRules,
  getUserRecord,
  sumDays,
  UserRecord,
} from './screenShareStore';
import { lastWeekDateKeys, weekDateKeys } from '../utils/time';

/**
 * 출석 판정과 주간 경고 계산.
 *
 * Java 버전과 달리 "출석 여부"를 저장하지 않고 그때그때 계산한다.
 * 기준(attendanceThresholdMinutes)을 바꾸면 과거 기록에도 새 기준이 적용된다.
 */

/** 하루 출석 인정 여부 */
export function isAttended(record: UserRecord, dateKey: string, thresholdMinutes: number): boolean {
  return (record.daily[dateKey] ?? 0) >= thresholdMinutes * 60_000;
}

/** 날짜 목록 중 출석으로 인정된 일수 */
export function countAttendedDays(
  record: UserRecord,
  dateKeys: string[],
  thresholdMinutes: number,
): number {
  return dateKeys.filter((key) => isAttended(record, key, thresholdMinutes)).length;
}

/** 이번 주(월~오늘) 출석 일수 */
export function countThisWeekAttendance(
  guildId: string,
  userId: string,
  nowMs: number,
): number {
  const rules = getRules(guildId);
  return countAttendedDays(
    getUserRecord(guildId, userId),
    weekDateKeys(nowMs),
    rules.attendanceThresholdMinutes,
  );
}

/** 일일 정산 결과 한 줄 */
export interface DailySettlementRow {
  userId: string;
  ms: number;
  attended: boolean;
}

/**
 * 어제 기록으로 출석을 정산한다.
 * 출석 인정된 사람은 누적 출석일이 1 늘어난다.
 */
export function settleDaily(guildId: string, dateKey: string): DailySettlementRow[] {
  const rules = getRules(guildId);

  const rows = getGuildRecords(guildId)
    .map(({ userId, record }) => ({
      userId,
      ms: record.daily[dateKey] ?? 0,
      attended: isAttended(record, dateKey, rules.attendanceThresholdMinutes),
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);

  for (const row of rows) {
    if (row.attended) addAttendanceDay(guildId, row.userId);
  }

  return rows;
}

/** 주간 경고 결과 한 줄 */
export interface WeeklyWarningRow {
  userId: string;
  attendedDays: number;
  warnings: number;
  /** 누적 경고가 기준을 넘어 강퇴 검토 대상이 되었는가 */
  kickCandidate: boolean;
}

/**
 * 지난주 출석 기준 미달자에게 경고를 부여한다.
 *
 * Java 버전은 "기록이 있는 모든 유저"를 대상으로 해서
 * 한 번 참여한 뒤 안 나오는 사람도 매주 경고를 받았다.
 * 여기서는 "지난주에 한 번이라도 참여한 사람"만 대상으로 한다.
 */
export function settleWeeklyWarnings(guildId: string, nowMs: number): WeeklyWarningRow[] {
  const rules = getRules(guildId);
  const dateKeys = lastWeekDateKeys(nowMs);
  const results: WeeklyWarningRow[] = [];

  for (const { userId, record } of getGuildRecords(guildId)) {
    // 지난주에 아예 참여하지 않았으면 대상에서 제외
    if (sumDays(record, dateKeys) <= 0) continue;

    const attendedDays = countAttendedDays(record, dateKeys, rules.attendanceThresholdMinutes);
    if (attendedDays >= rules.weeklyRequiredDays) continue;

    const warnings = addWarning(guildId, userId);

    results.push({
      userId,
      attendedDays,
      warnings,
      kickCandidate: warnings >= rules.maxWarningsBeforeKick,
    });
  }

  return results.sort((a, b) => b.warnings - a.warnings);
}
