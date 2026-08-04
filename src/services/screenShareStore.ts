import fs from 'node:fs';
import path from 'node:path';
import { nextMidnight, toDateKey } from '../utils/time';

/**
 * 화면공유 누적 시간을 JSON 파일 하나에 저장한다.
 * DB 없이 동작하며, 나중에 DB 로 옮길 때는 이 파일의 함수 시그니처만 유지하면 된다.
 */

/** 유저 한 명의 기록 */
export interface UserRecord {
  /** 전체 누적 밀리초 */
  totalMs: number;
  /** 'YYYY-MM-DD' -> 그날의 밀리초 (KST 기준) */
  daily: Record<string, number>;
  /** 주간 출석 기준 미달로 받은 누적 경고 횟수 */
  warnings?: number;
  /** 출석으로 인정된 누적 일수 */
  attendanceDays?: number;
}

/** 스터디 운영 규칙 (서버마다 다르게 설정 가능) */
export interface StudyRules {
  /** 이 기능 전체 on/off */
  enabled: boolean;
  /** 감시할 스터디 음성채널. 없으면 유예시간 경고가 동작하지 않는다. */
  studyChannelId?: string;
  /** 경고·정산 메시지를 보낼 텍스트채널. 없으면 결산 채널을 사용한다. */
  notifyChannelId?: string;
  /** 입장 후 화면공유를 켤 때까지 봐주는 시간(분) */
  gracePeriodMinutes: number;
  /** 하루 출석으로 인정할 최소 화면공유 시간(분) */
  attendanceThresholdMinutes: number;
  /** 한 주에 채워야 하는 출석 일수 */
  weeklyRequiredDays: number;
  /** 이 횟수 이상 경고가 쌓이면 관리자에게 강퇴 대상으로 알림 */
  maxWarningsBeforeKick: number;
}

/** Java 버전과 동일한 기본값 */
export const DEFAULT_RULES: StudyRules = {
  enabled: false,
  gracePeriodMinutes: 3,
  attendanceThresholdMinutes: 60,
  weeklyRequiredDays: 3,
  maxWarningsBeforeKick: 3,
};

/** 서버별 결산 공지 설정 */
export interface GuildSettings {
  /** 결산을 올릴 채널. 없으면 공지 기능이 꺼진 상태 */
  reportChannelId?: string;
  /** 마지막으로 일일 결산을 보낸 날짜 키 (중복 전송 방지) */
  lastDailyReport?: string;
  /** 마지막으로 주간 결산을 보낸 주의 월요일 날짜 키 */
  lastWeeklyReport?: string;
  /** 마지막으로 주간 경고를 처리한 날짜 키 (중복 경고 방지) */
  lastWeeklyWarning?: string;
  /** 스터디 운영 규칙 */
  rules?: Partial<StudyRules>;
}

interface StoreData {
  version: 1;
  /** guildId -> userId -> 기록 */
  guilds: Record<string, Record<string, UserRecord>>;
  /** guildId -> 설정 */
  settings?: Record<string, GuildSettings>;
}

/** 일별 기록 보관 기간. 파일이 무한히 커지는 걸 막는다. */
const KEEP_DAYS = 120;

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'screenshare.json');

let data: StoreData = { version: 1, guilds: {} };
let saveTimer: NodeJS.Timeout | null = null;

/** 봇 시작 시 한 번 호출. 파일이 없거나 깨졌으면 빈 데이터로 시작한다. */
export function loadStore(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('📂 화면공유 기록 파일이 없어 새로 시작합니다.');
      return;
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as StoreData;

    if (parsed?.version === 1 && parsed.guilds) {
      data = parsed;
      const userCount = Object.values(parsed.guilds).reduce(
        (sum, users) => sum + Object.keys(users).length,
        0,
      );
      console.log(`📂 화면공유 기록 로드 완료 (유저 ${userCount}명)`);
    } else {
      console.warn('⚠️  기록 파일 형식이 달라 새로 시작합니다.');
    }
  } catch (error) {
    // 파일이 깨져도 봇이 죽으면 안 되므로 로그만 남기고 빈 데이터로 진행
    console.error('⚠️  기록 파일을 읽지 못해 새로 시작합니다.', error);
  }
}

/** 실제 파일 쓰기. 쓰다가 죽어도 원본이 깨지지 않도록 임시 파일 -> rename */
function writeNow(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    console.error('⚠️  기록 저장 실패', error);
  }
}

/**
 * 저장 예약. 짧은 시간에 여러 번 호출돼도 파일 쓰기는 한 번만 한다.
 * flush=true 면 즉시 쓴다. (종료 직전에 사용)
 */
export function saveStore(flush = false): void {
  if (flush) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    writeNow();
    return;
  }

  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeNow();
  }, 3000);
}

function getOrCreateUser(guildId: string, userId: string): UserRecord {
  const guild = (data.guilds[guildId] ??= {});
  return (guild[userId] ??= { totalMs: 0, daily: {} });
}

/** 오래된 일별 기록 정리 */
function pruneDaily(record: UserRecord, nowMs: number): void {
  const cutoff = toDateKey(nowMs - KEEP_DAYS * 24 * 60 * 60 * 1000);
  for (const key of Object.keys(record.daily)) {
    if (key < cutoff) delete record.daily[key];
  }
}

/**
 * [startMs, endMs) 구간을 누적한다.
 *
 * 자정을 넘긴 세션은 날짜별로 쪼개서 기록한다.
 * 예: 23:40 시작 ~ 00:30 종료 -> 어제 20분 + 오늘 30분
 */
export function addDuration(
  guildId: string,
  userId: string,
  startMs: number,
  endMs: number,
): void {
  if (endMs <= startMs) return;

  const record = getOrCreateUser(guildId, userId);
  let cursor = startMs;

  while (cursor < endMs) {
    const boundary = Math.min(nextMidnight(cursor), endMs);
    const slice = boundary - cursor;
    const key = toDateKey(cursor);

    record.daily[key] = (record.daily[key] ?? 0) + slice;
    record.totalMs += slice;

    cursor = boundary;
  }

  pruneDaily(record, endMs);
  saveStore();
}

/** 유저 한 명의 기록 (없으면 0으로 채운 빈 기록) */
export function getUserRecord(guildId: string, userId: string): UserRecord {
  return data.guilds[guildId]?.[userId] ?? { totalMs: 0, daily: {} };
}

/** 서버의 모든 유저 기록 */
export function getGuildRecords(guildId: string): { userId: string; record: UserRecord }[] {
  const guild = data.guilds[guildId] ?? {};
  return Object.entries(guild).map(([userId, record]) => ({ userId, record }));
}

/** 날짜 키 목록에 해당하는 합계 */
export function sumDays(record: UserRecord, dateKeys: string[]): number {
  return dateKeys.reduce((sum, key) => sum + (record.daily[key] ?? 0), 0);
}

/** 서버 설정 조회 */
export function getSettings(guildId: string): GuildSettings {
  return data.settings?.[guildId] ?? {};
}

/** 서버 설정 일부만 갱신 */
export function updateSettings(guildId: string, patch: Partial<GuildSettings>): void {
  data.settings ??= {};
  data.settings[guildId] = { ...data.settings[guildId], ...patch };
  saveStore();
}

/** 설정이 있는 서버 ID 목록 */
export function getConfiguredGuildIds(): string[] {
  return Object.keys(data.settings ?? {});
}

/** 서버의 스터디 규칙 (설정되지 않은 값은 기본값으로 채워서 반환) */
export function getRules(guildId: string): StudyRules {
  return { ...DEFAULT_RULES, ...(data.settings?.[guildId]?.rules ?? {}) };
}

/** 규칙 일부만 갱신 */
export function updateRules(guildId: string, patch: Partial<StudyRules>): void {
  data.settings ??= {};
  const current = data.settings[guildId] ?? {};
  data.settings[guildId] = { ...current, rules: { ...current.rules, ...patch } };
  saveStore();
}

/** 경고 1회 부여. 부여 후의 누적 횟수를 돌려준다. */
export function addWarning(guildId: string, userId: string): number {
  const record = getOrCreateUser(guildId, userId);
  record.warnings = (record.warnings ?? 0) + 1;
  saveStore();
  return record.warnings;
}

/** 경고 초기화 */
export function resetWarnings(guildId: string, userId: string): void {
  const record = getOrCreateUser(guildId, userId);
  record.warnings = 0;
  saveStore();
}

/** 누적 출석일 1일 추가 */
export function addAttendanceDay(guildId: string, userId: string): void {
  const record = getOrCreateUser(guildId, userId);
  record.attendanceDays = (record.attendanceDays ?? 0) + 1;
  saveStore();
}

/** 테스트용 — 메모리 상태를 초기화한다. */
export function __resetForTest(): void {
  data = { version: 1, guilds: {}, settings: {} };
}
