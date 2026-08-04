/**
 * 시간 계산 유틸.
 *
 * 모든 날짜 구분은 한국 시간(KST, UTC+9) 자정 기준이다.
 * 한국은 서머타임이 없어서 고정 오프셋 계산이 안전하다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 타임스탬프 -> 'YYYY-MM-DD' (KST 기준) */
export function toDateKey(ms: number): string {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 해당 시각이 속한 KST 날짜의 "다음 자정" 타임스탬프 */
export function nextMidnight(ms: number): number {
  return (Math.floor((ms + KST_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - KST_OFFSET_MS;
}

/** 1970-01-01 부터 며칠째인지 (KST 기준) */
export function dayIndex(ms: number): number {
  return Math.floor((ms + KST_OFFSET_MS) / DAY_MS);
}

/**
 * 이번 주(월요일 시작) 날짜 키 목록.
 * 1970-01-01 은 목요일이므로 (dayIndex + 3) % 7 이 "월요일로부터 며칠째"가 된다.
 */
export function weekDateKeys(ms: number): string[] {
  const today = dayIndex(ms);
  const daysSinceMonday = (today + 3) % 7;
  const keys: string[] = [];

  for (let i = daysSinceMonday; i >= 0; i -= 1) {
    keys.push(toDateKey(ms - i * DAY_MS));
  }

  return keys;
}

/** 어제 날짜 키 */
export function yesterdayDateKey(ms: number): string {
  return toDateKey(ms - DAY_MS);
}

/** 월요일이면 true (KST 기준) */
export function isMonday(ms: number): boolean {
  return (dayIndex(ms) + 3) % 7 === 0;
}

/** 지난주(월~일) 7일치 날짜 키 */
export function lastWeekDateKeys(ms: number): string[] {
  const daysSinceMonday = (dayIndex(ms) + 3) % 7;
  const lastMonday = ms - (daysSinceMonday + 7) * DAY_MS;
  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    keys.push(toDateKey(lastMonday + i * DAY_MS));
  }
  return keys;
}

/** 'YYYY-MM-DD' -> '8월 4일' */
export function formatDateKey(key: string): string {
  const [, month, day] = key.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

/** 최근 n일 날짜 키 목록 (오늘 포함) */
export function recentDateKeys(ms: number, days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(toDateKey(ms - i * DAY_MS));
  }
  return keys;
}

/** 밀리초 -> "3시간 24분" 같은 한글 표기 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(ms, 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}시간`);
  if (minutes > 0) parts.push(`${minutes}분`);
  // 1시간 미만일 때만 초 단위까지 보여준다.
  if (hours === 0 && (seconds > 0 || parts.length === 0)) parts.push(`${seconds}초`);

  return parts.join(' ');
}

export const TIME_CONSTANTS = { KST_OFFSET_MS, DAY_MS };
