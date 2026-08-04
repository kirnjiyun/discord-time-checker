import { addDuration, saveStore } from './screenShareStore';

/**
 * "지금 화면공유 중인 세션"을 메모리에서 관리한다.
 *
 * 종료 시점에만 저장하면 봇이 갑자기 죽었을 때 진행 중이던 시간이 통째로 날아간다.
 * 그래서 1분마다 경과분을 저장소에 반영하고 시작 시각을 앞당기는 방식(flush)을 쓴다.
 */

interface ActiveSession {
  guildId: string;
  userId: string;
  channelId: string;
  /** 아직 저장소에 반영되지 않은 구간의 시작 시각 */
  startedAt: number;
  /** 화면공유를 실제로 시작한 시각 (표시용, flush 해도 바뀌지 않음) */
  sessionStartedAt: number;
}

const FLUSH_INTERVAL_MS = 60_000;

const sessions = new Map<string, ActiveSession>();
let flushTimer: NodeJS.Timeout | null = null;

const keyOf = (guildId: string, userId: string) => `${guildId}:${userId}`;

/** 화면공유 시작 */
export function startSession(
  guildId: string,
  userId: string,
  channelId: string,
  at: number = Date.now(),
): void {
  const key = keyOf(guildId, userId);
  if (sessions.has(key)) return; // 이미 기록 중이면 무시 (중복 이벤트 방어)

  sessions.set(key, {
    guildId,
    userId,
    channelId,
    startedAt: at,
    sessionStartedAt: at,
  });
}

/** 화면공유 종료. 종료된 세션의 총 길이(ms)를 돌려준다. */
export function stopSession(
  guildId: string,
  userId: string,
  at: number = Date.now(),
): number {
  const key = keyOf(guildId, userId);
  const session = sessions.get(key);
  if (!session) return 0;

  sessions.delete(key);
  addDuration(guildId, userId, session.startedAt, at);

  return at - session.sessionStartedAt;
}

/**
 * 진행 중인 모든 세션의 경과분을 저장소에 반영한다.
 * 세션은 그대로 유지되고 startedAt 만 현재 시각으로 당겨진다.
 */
export function flushSessions(at: number = Date.now()): void {
  for (const session of sessions.values()) {
    if (at <= session.startedAt) continue;
    addDuration(session.guildId, session.userId, session.startedAt, at);
    session.startedAt = at;
  }
}

/** 서버의 진행 중 세션 목록 (경과 시간이 긴 순) */
export function getActiveSessions(guildId: string): ActiveSession[] {
  return [...sessions.values()]
    .filter((session) => session.guildId === guildId)
    .sort((a, b) => a.sessionStartedAt - b.sessionStartedAt);
}

/** 특정 유저가 지금 화면공유 중이면 그 세션을 돌려준다. */
export function getActiveSession(
  guildId: string,
  userId: string,
): ActiveSession | undefined {
  return sessions.get(keyOf(guildId, userId));
}

/** 아직 저장되지 않은 진행 중 세션의 경과 시간 (조회 명령어에서 더해주기 위함) */
export function getPendingMs(
  guildId: string,
  userId: string,
  at: number = Date.now(),
): number {
  const session = sessions.get(keyOf(guildId, userId));
  if (!session) return 0;
  return Math.max(at - session.startedAt, 0);
}

/** 1분마다 자동 저장 시작 */
export function startAutoFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => flushSessions(), FLUSH_INTERVAL_MS);
  // 이 타이머 때문에 프로세스가 종료되지 않는 일이 없도록
  flushTimer.unref();
}

/** 봇 종료 직전 호출 — 진행 중인 시간까지 전부 저장 */
export function shutdownTracker(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushSessions();
  saveStore(true);
}

/** 테스트용 */
export function __resetForTest(): void {
  sessions.clear();
}
