# Discord 화면공유 시간 측정 봇

디스코드 음성채널에서 **화면공유(Go Live)를 켠 시간**을 자동으로 기록하고,
랭킹과 자정 결산 공지를 제공하는 봇입니다.

스터디 서버, 캠스터디, 작업방처럼 "누가 얼마나 했는지"를 기록하고 싶은 곳을 위해 만들었습니다.

- 🖥️ 화면공유 시간을 자동 집계 (수동 체크인 불필요)
- 🏆 오늘 / 어제 / 이번 주 / 지난주 / 전체 랭킹
- 📮 매일 한국시간 자정에 "어제의 결산"을 채널에 자동 공지
- ⏰ 스터디 채널에 들어와 화면공유를 안 켜면 유예시간 후 자동 알림
- 📋 하루 출석 기준 · 주간 출석 일수 미달 시 경고 누적
- 💾 DB 설치 불필요 — JSON 파일 하나로 동작
- 🔒 봇이 갑자기 꺼져도 최대 1분치만 손실

TypeScript + discord.js v14 기반이며, 명령어를 추가하기 쉬운 구조로 되어 있습니다.

---

## 목차

1. [명령어 한눈에 보기](#1-명령어-한눈에-보기)
2. [준비물](#2-준비물)
3. [Discord 봇 만들기](#3-discord-봇-만들기)
4. [설치와 실행](#4-설치와-실행)
5. [자동 결산 공지 설정](#5-자동-결산-공지-설정)
6. [시간 집계가 동작하는 방식](#6-시간-집계가-동작하는-방식)
7. [폴더 구조](#7-폴더-구조)
8. [데이터 파일](#8-데이터-파일)
9. [명령어 추가하기](#9-명령어-추가하기)
10. [24시간 배포하기](#10-24시간-배포하기)
11. [문제 해결](#11-문제-해결)
12. [보안 주의사항](#12-보안-주의사항)

---

## 1. 명령어 한눈에 보기

### 화면공유 시간

| 명령어 | 설명 | 필요 권한 |
|---|---|---|
| `/screentime [user]` | 오늘 / 이번 주 / 전체 누적 시간 조회 | - |
| `/ranking [period]` | 랭킹 TOP 10 (오늘·어제·이번주·지난주·전체) | - |
| `/live` | 지금 화면공유 중인 사람과 경과 시간 | - |
| `/report set\|off\|status\|test` | 자정 자동 결산 공지 설정 | 서버 관리 |

### 스터디 규칙 (출석 · 경고)

| 명령어 | 설명 | 필요 권한 |
|---|---|---|
| `/warning show [user]` | 경고·출석 현황 확인 | - |
| `/warning reset <user>` | 누적 경고 초기화 | 서버 관리 |
| `/rule show` | 현재 규칙 확인 | 서버 관리 |
| `/rule set [...]` | 유예시간·출석기준·경고 기준 변경 | 서버 관리 |
| `/rule on` / `/rule off` | 스터디 규칙 켜기 / 끄기 | 서버 관리 |

### 서버 · 유저 정보

| 명령어 | 설명 | 필요 권한 |
|---|---|---|
| `/userinfo [user]` | 유저 정보 (가입일, 역할, 부스트 등) | - |
| `/serverinfo` | 서버 정보 (멤버 수, 채널 수, 부스트 등) | - |

### 기본 · 관리

| 명령어 | 설명 | 필요 권한 |
|---|---|---|
| `/ping` | 봇 상태와 응답 속도 확인 | - |
| `/hello [user]` | 인사 | - |
| `/help` | 명령어 목록 | - |
| `/embed` | embed 메시지 만들어 보내기 | - |
| `/clear <amount> [user]` | 메시지 일괄 삭제 (1~100개) | 메시지 관리 |
| `/announce <channel> <message>` | 지정 채널에 공지 전송 | 메시지 관리 |

> 권한이 필요한 명령어는 권한이 없는 사람에게는 목록에 아예 보이지 않습니다.

<details>
<summary>명령어별 옵션 자세히 보기</summary>

**`/screentime [user]`**
- `user` (선택) — 조회할 유저. 비우면 본인
- 지금 화면공유 중이면 진행 중인 시간까지 합산해서 보여줍니다.

**`/ranking [period]`**
- `period` (선택) — `오늘`(기본) / `어제` / `이번 주` / `지난주` / `전체 누적`
- 참여 인원과 총 시간을 함께 표시합니다.

**`/live`**
- 현재 화면공유 중인 사람, 채널, 경과 시간을 보여줍니다.

**`/report set <channel>`**
- 결산을 올릴 채널을 지정합니다. 봇에게 그 채널의 `채널 보기` / `메시지 보내기` / `링크 첨부` 권한이 필요합니다.

**`/report off`** — 자동 공지를 끕니다. (기록은 계속 쌓입니다)
**`/report status`** — 현재 설정을 확인합니다.
**`/report test`** — 자정을 기다리지 않고 결산을 미리 봅니다. (본인에게만 표시)

**`/rule set [studychannel] [notifychannel] [grace] [attendance] [weeklydays] [maxwarnings]`**
- 모든 옵션이 선택이며, **입력한 항목만** 바뀝니다.
- `studychannel` — 유예시간 경고를 적용할 음성채널 (필수 설정)
- `notifychannel` — 경고·정산 알림 채널. 비우면 결산 채널을 사용합니다.
- `grace` — 입장 후 화면공유까지 봐주는 시간(분), 기본 3
- `attendance` — 하루 출석 인정 최소 시간(분), 기본 60
- `weeklydays` — 한 주에 채워야 하는 출석 일수, 기본 3
- `maxwarnings` — 강퇴 검토 대상이 되는 누적 경고 횟수, 기본 3

**`/warning show [user]`**
- 누적 경고, 누적 출석일, 이번 주 출석 일수와 남은 일수를 보여줍니다.

**`/clear <amount> [user]`**
- `amount` (필수) — 삭제할 개수 (1~100)
- `user` (선택) — 특정 유저의 메시지만 삭제
- Discord 정책상 **14일이 지난 메시지는 삭제할 수 없습니다.**

**`/announce <channel> <message> [title] [color]`**
- `message` 안에 `\n` 을 쓰면 줄바꿈이 됩니다.

</details>

---

## 2. 준비물

- **Node.js 18 이상** — [nodejs.org](https://nodejs.org) 에서 LTS 설치
  확인: 터미널에서 `node -v`
- **Discord 계정** 과 **봇을 넣을 서버의 관리자 권한**

---

## 3. Discord 봇 만들기

### 3-1. 애플리케이션 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 우측 상단 **New Application** → 이름 입력 → **Create**
3. 왼쪽 **General Information** → **APPLICATION ID** 복사
   → `.env` 의 `DISCORD_CLIENT_ID` 에 사용

### 3-2. 봇 토큰 발급

1. 왼쪽 메뉴 **Bot** 클릭
2. **Reset Token** → **Yes, do it!** → 나온 토큰 복사
   → `.env` 의 `DISCORD_TOKEN` 에 사용

> ⚠️ 토큰은 발급 직후 **한 번만** 보입니다. 놓쳤다면 Reset Token 을 다시 누르면 됩니다.
> 토큰이 유출되면 누구나 봇을 조종할 수 있으니 즉시 Reset 하세요.

### 3-3. 인텐트(Intents) 설정

**특권 인텐트(Privileged Gateway Intents)는 켤 필요가 없습니다.**
Bot 페이지의 스위치들은 전부 꺼진 채로 두세요.

이 봇이 사용하는 인텐트는 코드에서 지정하며, 둘 다 특권이 아닙니다.

| 인텐트 | 용도 |
|---|---|
| `Guilds` | 슬래시 명령어 동작 |
| `GuildVoiceStates` | 화면공유 시작/종료 감지 |

### 3-4. 서버에 초대

1. 왼쪽 **OAuth2** → **URL Generator**
2. **SCOPES** — `bot`, `applications.commands` 체크
3. **BOT PERMISSIONS** — 아래 5개 체크

   | 권한 | 왜 필요한가 |
   |---|---|
   | View Channels | 채널을 인식하기 위해 |
   | Send Messages | 명령어 응답, 결산 공지 |
   | Embed Links | 임베드 메시지 전송 |
   | Read Message History | `/clear` 가 지울 메시지를 읽기 위해 |
   | Manage Messages | `/clear`, `/announce` |

4. 맨 아래 **GENERATED URL** 복사 → 브라우저에 붙여넣기 → 서버 선택 → 승인

> 위 과정을 건너뛰고 싶다면 아래 URL 의 `<APPLICATION_ID>` 만 바꿔서 접속해도 됩니다.
> `https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&permissions=93184&scope=bot%20applications.commands`

### 3-5. 서버 ID 복사 (선택)

Discord 앱 → **설정 → 고급 → 개발자 모드 ON** → 서버 아이콘 우클릭 → **서버 ID 복사**
→ `.env` 의 `DISCORD_GUILD_ID` 에 사용

개발 중에는 반드시 넣는 것을 권합니다. 없으면 명령어 반영에 최대 1시간이 걸립니다.

---

## 4. 설치와 실행

### 방법 A — macOS 더블클릭 (터미널을 몰라도 됨)

프로젝트 폴더의 **`시작하기.command`** 를 더블클릭하면 아래를 자동으로 해줍니다.

1. Node.js 설치 확인
2. `.env` 파일 생성 후 편집기로 열기 (토큰만 채우고 저장 → Enter)
3. `npm install`
4. 슬래시 명령어 등록
5. 봇 실행

> "확인되지 않은 개발자" 경고가 뜨면 파일 **우클릭 → 열기 → 열기** 로 실행하세요.

### 방법 B — 터미널에서 직접 (macOS / Windows 공통)

```bash
# 1) 저장소 받기
git clone https://github.com/kirnjiyun/discord-time-checker.git
cd discord-time-checker

# 2) 환경변수 파일 준비
cp .env.example .env          # Windows PowerShell: copy .env.example .env
#    .env 를 편집기로 열어 값을 채웁니다

# 3) 패키지 설치
npm install

# 4) 슬래시 명령어를 Discord 에 등록
npm run deploy

# 5) 실행
npm run dev
```

`✅ 로그인 완료: 봇이름#0000` 이 보이면 성공입니다.
Discord 채팅창에 `/` 를 입력하면 명령어 목록이 나타납니다.

### npm 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 모드 실행 (ts-node, 빌드 없이 바로 실행) |
| `npm run deploy` | 슬래시 명령어를 Discord 에 등록 |
| `npm run build` | TypeScript 를 `dist/` 로 컴파일 |
| `npm start` | 빌드된 결과물 실행 (배포용) |
| `npm run typecheck` | 타입 검사만 수행 |

> 명령어의 **이름이나 옵션을 바꾸면 반드시 `npm run deploy` 를 다시 실행**해야 합니다.
> 내부 로직만 바꿨다면 봇 재시작만으로 충분합니다.

---

## 5. 자동 결산 공지 설정

봇을 실행한 뒤 Discord 에서 한 번만 실행하면 됩니다.

```
/report set channel:#결산채널
```

이후 **매일 한국시간 자정**에 지정한 채널로 어제의 결산이 올라갑니다.
**월요일 자정**에는 지난주(월~일) 결산도 함께 올라갑니다.

```
🏆 8월 4일 화면공유 결산
🥇 @홍길동 — 5시간 20분
🥈 @김철수 — 3시간 10분
🥉 @이영희 — 1시간 5분

참여 인원 3명 · 총 시간 9시간 35분
```

- `/report test` — 자정을 기다리지 않고 미리 보기 (본인에게만 표시)
- `/report status` — 현재 설정 확인
- `/report off` — 공지 끄기 (기록은 계속 쌓임)

**기록이 하나도 없는 날은 빈 결산을 올리지 않고 조용히 넘어갑니다.**

> 자정에 봇이 꺼져 있으면 그날 결산은 올라가지 않습니다.
> 컴퓨터가 절전 상태였다면 깨어난 뒤 실행되며, 같은 날 두 번 올리지는 않습니다.
> 매일 확실하게 받으려면 [24시간 배포](#10-24시간-배포하기)가 필요합니다.

---

## 5-2. 스터디 규칙 (유예시간 경고 · 출석 · 경고 누적)

기본값은 **꺼져 있습니다.** 켜려면 감시할 음성채널을 먼저 지정하세요.

```
/rule set studychannel:#스터디방 notifychannel:#알림
/rule on
```

### 동작

**① 유예시간 경고**

지정한 스터디 채널에 들어온 뒤 `grace`분(기본 3분) 안에 화면공유를 켜지 않으면
알림 채널에 멘션으로 알려줍니다.

- 화면공유 중에는 검사하지 않습니다.
- 화면공유를 껐다면 **그 시점부터 유예시간이 다시 시작**됩니다.
- 한 대기 구간에서 경고는 한 번만 갑니다. (도배 방지)
- 다른 음성채널(잡담방 등)은 감시하지 않습니다.

**② 하루 출석 판정**

자정 결산 시, 어제 화면공유 시간이 `attendance`분(기본 60분) 이상이면 출석으로 인정됩니다.
결산 임베드에 ⭕️ / ❌ 로 표시되고, 누적 출석일이 1 올라갑니다.

**③ 주간 출석 경고**

**월요일 자정**, 지난주(월~일) 출석 일수가 `weeklydays`일(기본 3일) 미만이면 경고가 1회 쌓입니다.

- **지난주에 한 번이라도 참여한 사람만** 대상입니다. 아예 안 나온 사람은 경고를 받지 않습니다.
- 누적 경고가 `maxwarnings`회(기본 3회)에 도달하면 **강퇴 검토 대상**으로 표시됩니다.
- **봇은 강퇴하지 않습니다.** 관리자에게 알리기만 하며, 실제 강퇴는 사람이 판단합니다.
- 봐주기로 했다면 `/warning reset <user>` 로 경고를 초기화하세요.

`/report test` 로 자정을 기다리지 않고 미리 볼 수 있습니다.
(미리보기는 출석일·경고를 실제로 바꾸지 않습니다)

### 왜 월요일 자정인가

이전 Java 버전은 주간 정산이 **일요일 23:55** 에 돌았습니다.
그런데 일요일 기록은 월요일 자정에 정산되므로,
**일요일 공부가 그 주 출석에 반영되지 않는 문제**가 있었습니다.

이 버전은 월요일 자정에 일일 정산을 먼저 끝낸 뒤 주간 경고를 계산합니다.

---

## 6. 시간 집계가 동작하는 방식

### 무엇을 세는가

음성채널에서 **화면공유(Go Live)를 켠 순간부터 끈 순간까지**만 셉니다.

| 상황 | 집계 |
|---|---|
| 화면공유 ON → OFF | ✅ 집계됨 |
| 화면공유 중 채널을 나감 | ✅ 나간 시점까지 집계 |
| 카메라만 켬 | ❌ 안 셈 |
| 음성채널에 그냥 있음 | ❌ 안 셈 |
| 봇 계정의 화면공유 | ❌ 무시 |

> 카메라나 접속 시간도 세고 싶다면 `src/events/voiceStateUpdate.ts` 에서
> `newState.streaming` 을 `newState.selfVideo` 또는 `newState.channelId` 조건으로 바꾸면 됩니다.

### 날짜 기준은 한국시간(KST) 자정

모든 "오늘 / 어제 / 이번 주" 는 **한국시간 자정**을 기준으로 나눕니다.
자정을 넘긴 세션은 날짜별로 쪼개서 기록합니다.

```
23:40 시작 ──────┼────── 00:30 종료
   어제 20분     자정      오늘 30분
```

다른 시간대를 쓰려면 `src/utils/time.ts` 의 `KST_OFFSET_MS` 를 바꾸세요.
(한국은 서머타임이 없어서 고정 오프셋으로 안전하게 계산합니다)

### 기록이 날아가지 않게 하는 장치

| 장치 | 동작 |
|---|---|
| **1분마다 자동 저장** | 진행 중인 시간을 1분 간격으로 파일에 반영. 봇이 갑자기 죽어도 최대 1분치만 손실 |
| **종료 시 저장** | `Control+C` (SIGINT/SIGTERM) 시 진행 중인 시간까지 저장하고 종료 |
| **재시작 시 복구** | 봇이 켜질 때 이미 화면공유 중인 사람을 찾아 그 시점부터 이어서 집계 |
| **원자적 쓰기** | 임시 파일에 쓴 뒤 교체하므로, 저장 도중 죽어도 기존 파일이 깨지지 않음 |
| **파일 손상 대비** | JSON 이 깨져 있으면 봇이 죽지 않고 빈 기록으로 시작 |

봇이 꺼져 있던 동안의 시간은 알 수 없으므로 세지 않습니다.

---

## 7. 폴더 구조

```
.
├── .env.example              환경변수 템플릿 (복사해서 .env 로 사용)
├── .gitignore
├── package.json
├── tsconfig.json
├── 시작하기.command           macOS 더블클릭 실행 스크립트
├── data/                     실제 기록이 저장되는 곳 (git 에 올라가지 않음)
│   └── screenshare.json
└── src/
    ├── index.ts              진입점 — 명령어/이벤트 자동 로드 후 로그인
    ├── config.ts             .env 읽기 + 누락 시 친절한 에러
    ├── deploy-commands.ts    슬래시 명령어를 Discord 에 등록
    ├── loader.ts             폴더 스캔 유틸 (.ts / .js 자동 대응)
    │
    ├── types/
    │   ├── command.ts        Command 인터페이스
    │   └── discord.d.ts      Client.commands 타입 확장
    │
    ├── utils/
    │   ├── embeds.ts         색상 상수 + 공용 임베드
    │   ├── errors.ts         CommandError (유저에게 보여줄 에러)
    │   ├── permissions.ts    권한 검사 헬퍼
    │   └── time.ts           KST 날짜 계산, 시간 표기
    │
    ├── services/
    │   ├── screenShareStore.ts     JSON 파일 저장소 + 규칙/경고
    │   ├── screenShareTracker.ts   진행 중인 세션 관리
    │   ├── ranking.ts              랭킹 계산
    │   ├── attendance.ts           출석 판정 · 주간 경고 계산
    │   ├── graceWatcher.ts         유예시간 경고 감시
    │   └── reportScheduler.ts      자정 결산 스케줄러
    │
    ├── commands/             슬래시 명령어 (파일 하나 = 명령어 하나)
    └── events/
        ├── ready.ts              로그인 완료 + 진행 중 세션 복구
        ├── interactionCreate.ts  명령어 실행 + 에러 처리
        └── voiceStateUpdate.ts   화면공유 시작/종료 감지
```

**설계 원칙**

- `commands/` 와 `events/` 는 폴더를 스캔해 자동 등록됩니다. 파일만 추가하면 됩니다.
- 비즈니스 로직은 `services/` 에 두고, 명령어 파일은 표시만 담당합니다.
- 사용자에게 보여줄 에러는 `CommandError` 로 던지면 `interactionCreate` 가 임베드로 바꿔줍니다.
  그 외 에러는 로그만 남기고 일반 문구를 보여줍니다. (내부 정보 노출 방지)

---

## 8. 데이터 파일

기록은 `data/screenshare.json` 파일 하나에 저장됩니다.

```json
{
  "version": 1,
  "guilds": {
    "서버ID": {
      "유저ID": {
        "totalMs": 18000000,
        "daily": { "2026-08-04": 7200000, "2026-08-05": 10800000 },
        "warnings": 1,
        "attendanceDays": 12
      }
    }
  },
  "settings": {
    "서버ID": {
      "reportChannelId": "채널ID",
      "lastDailyReport": "2026-08-05",
      "rules": {
        "enabled": true,
        "studyChannelId": "음성채널ID",
        "gracePeriodMinutes": 3,
        "attendanceThresholdMinutes": 60,
        "weeklyRequiredDays": 3,
        "maxWarningsBeforeKick": 3
      }
    }
  }
}
```

- 단위는 **밀리초**입니다.
- 일별 기록은 **최근 120일**만 보관하고 오래된 것은 자동 삭제됩니다. (누적 `totalMs` 는 유지)
- 이 파일이 곧 데이터 전부입니다. **백업은 이 파일 하나만 복사하면 됩니다.**
- 다른 컴퓨터나 서버로 옮길 때도 `data/` 폴더째 복사하면 그대로 이어집니다.

> `data/` 는 `.gitignore` 에 포함되어 있어 GitHub 에 올라가지 않습니다.
> 서버마다 다른 실제 사용자 데이터이므로 공개 저장소에 올리지 마세요.

### 나중에 DB 로 바꾸려면

`src/services/screenShareStore.ts` 의 함수 시그니처만 유지한 채 내부 구현을
MongoDB / Supabase / SQLite 로 교체하면 나머지 코드는 손댈 필요가 없습니다.

교체 대상: `loadStore`, `saveStore`, `addDuration`, `getUserRecord`,
`getGuildRecords`, `getSettings`, `updateSettings`

---

## 9. 명령어 추가하기

`src/commands/` 에 파일 하나를 만들면 자동으로 로드됩니다.

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../types/command';
import { CommandError } from '../utils/errors';

const mycommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mycommand')          // 소문자만 가능
    .setDescription('설명')
    .addStringOption((option) =>
      option.setName('text').setDescription('입력값').setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const text = interaction.options.getString('text', true);

    if (text.length > 100) {
      // 사용자에게 그대로 보여줄 에러
      throw new CommandError('100자 이하로 입력해 주세요.');
    }

    await interaction.reply(`입력값: ${text}`);
  },
};

export default mycommand;
```

만든 뒤 `npm run deploy` → 봇 재시작.
`src/commands/help.ts` 의 목록 배열에도 한 줄 추가해 주세요.

**권한이 필요한 명령어라면** 2중으로 막습니다.

```ts
// 1) Discord UI 에서 명령어 자체를 숨김
.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

// 2) 실행 시점에 다시 검사 (관리자가 1번 설정을 덮어쓸 수 있으므로)
const { guild, member } = requireGuild(interaction);
requireMemberPermission(member, PermissionFlagsBits.ManageMessages);
```

**3초 이상 걸리는 작업**은 먼저 `deferReply()` 를 호출해야 합니다.
Discord 는 3초 안에 응답이 없으면 "애플리케이션이 응답하지 않았어요" 를 표시합니다.

---

## 10. 24시간 배포하기

로컬 실행은 터미널을 닫으면 봇도 꺼집니다. 자정 결산을 매일 받으려면 호스팅이 필요합니다.

### Railway / Render 공통

1. 이 저장소를 GitHub 에 올립니다. (`.env` 는 절대 함께 올리지 마세요)
2. Railway / Render 에서 저장소를 연결합니다.
3. 환경변수 3개를 호스팅 대시보드에 직접 등록합니다.
   `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`
4. 빌드/실행 명령을 설정합니다.

   | 항목 | 값 |
   |---|---|
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |

5. 최초 1회만 `npm run deploy` 를 실행해 명령어를 등록합니다.
   (로컬에서 실행해도 됩니다 — 등록은 Discord 서버에 저장되므로 한 번이면 충분합니다)

### 배포 시 주의: 데이터 유지

`data/screenshare.json` 은 **서버의 디스크에 저장**됩니다.
Railway / Render 의 기본 컨테이너는 재배포 시 디스크가 초기화되므로,
기록을 유지하려면 **영구 볼륨(Persistent Volume)을 `/app/data` 에 연결**하거나
외부 DB 로 옮겨야 합니다. ([8번 항목](#나중에-db-로-바꾸려면) 참고)

---

## 11. 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `/` 를 눌러도 명령어가 안 보임 | `npm run deploy` 를 실행하지 않았거나 `DISCORD_GUILD_ID` 가 틀림. 비워두면 전역 등록이라 최대 1시간 소요 |
| **애플리케이션이 응답하지 않았어요** | 명령어는 등록됐지만 봇 프로세스가 꺼져 있거나 죽음. 터미널 로그를 확인하세요 |
| `Property 'commands' does not exist on type 'Client'` | `tsconfig.json` 에 `"ts-node": { "files": true }` 가 있는지 확인. ts-node 는 기본적으로 `.d.ts` 를 읽지 않습니다 |
| 로그인 실패 (`TOKEN_INVALID`) | `DISCORD_TOKEN` 오타 또는 만료. Reset Token 후 다시 붙여넣기 |
| 명령어 등록 실패 | `DISCORD_CLIENT_ID` 가 틀리거나, 봇이 그 서버에 초대되지 않음 |
| "봇에게 ~ 권한이 없어요" | 서버 설정 → 연동 또는 **채널별 권한**에서 봇 역할에 권한 추가. 서버 권한이 있어도 채널 권한 덮어쓰기로 막히는 경우가 가장 흔합니다 |
| `/clear` 가 0개 삭제 | Discord 정책상 **14일이 지난 메시지는 일괄 삭제 불가** |
| 화면공유를 켰는데 집계가 안 됨 | `src/index.ts` 의 intents 에 `GuildVoiceStates` 가 있는지 확인. 카메라만 켠 경우는 집계 대상이 아닙니다 |
| 유예시간 경고가 안 옴 | `/rule show` 로 **켜짐** 상태이고 스터디 채널이 지정됐는지 확인. 화면공유 중이면 경고하지 않는 게 정상입니다 |
| 주간 경고가 안 옴 | 월요일 자정에만 계산됩니다. 지난주에 아예 참여하지 않은 사람은 대상이 아닙니다 |
| 자정에 결산이 안 올라옴 | 그 시각에 봇이 꺼져 있었을 가능성. `/report status` 로 채널 설정을 확인하고 `/report test` 로 동작을 점검하세요 |
| 명령어를 고쳤는데 반영 안 됨 | 이름·옵션을 바꿨다면 `npm run deploy` 재실행 필요 |

### 로그 확인 포인트

터미널에 아래 접두사가 붙은 메시지가 뜨면 그 부분을 먼저 보세요.

```
[command:이름] 실행 실패   → 특정 명령어에서 발생한 에러
[interactionCreate]        → 응답 전송 실패 (토큰 만료 등)
[report]                   → 자정 결산 전송 실패
[unhandledRejection]       → 어디선가 처리되지 않은 에러
⚠️  기록 저장 실패          → 디스크 권한 / 용량 문제
```

정상 동작 시에는 이런 로그가 보입니다.

```
📦 명령어 12개 로드 완료
🔔 이벤트 3개 로드 완료
📂 화면공유 기록 로드 완료 (유저 5명)
✅ 로그인 완료: 봇이름#0000
⏰ 다음 결산 예정: 2026. 8. 6. 오전 12:00:05
🔴 화면공유 시작: 홍길동#1234
⚪️ 화면공유 종료: 홍길동#1234 (2시간 15분)
```

---

## 12. 보안 주의사항

- **`.env` 를 절대 커밋하지 마세요.** `.gitignore` 에 포함되어 있지만, 강제로 추가하지 않도록 주의하세요.
- **토큰이 유출되면 즉시 Reset Token** 을 누르세요. 이전 토큰은 바로 무효화됩니다.
- 실수로 커밋했다면 토큰을 지우는 것만으로는 부족합니다. **Reset Token 이 유일한 해결책**입니다.
  (git 히스토리에 남아 있기 때문)
- `data/screenshare.json` 에는 서버 멤버의 유저 ID와 활동 시간이 들어 있습니다. 공개 저장소에 올리지 마세요.
- 배포 시 환경변수는 호스팅 대시보드에 직접 입력하고, 파일로 올리지 마세요.

---

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 언어 | TypeScript | 옵션 이름·권한 상수 오타를 컴파일 단계에서 잡을 수 있음 |
| 라이브러리 | discord.js v14 | 슬래시 명령어·인텐트 지원이 가장 성숙 |
| 실행 | ts-node (개발) / tsc (배포) | 개발 중 빌드 없이 즉시 실행 |
| 저장 | JSON 파일 | DB 설치 없이 시작 가능. 수십~수백 명 규모까지 충분 |
| 스케줄러 | `setTimeout` 재귀 | 외부 패키지 없이 다음 자정을 매번 재계산해 시간 밀림 방지 |

외부 의존성은 `discord.js` 와 `dotenv` 둘뿐입니다.

---

---

## 이전 버전 (Spring Boot + JDA)

이 저장소는 원래 Java(Spring Boot + JDA + PostgreSQL) 로 시작했고,
현재의 Node.js/TypeScript 버전으로 교체되었습니다.

Java 버전은 git 히스토리에 그대로 남아 있어 언제든 확인할 수 있습니다.

```bash
# Java 버전 마지막 상태 보기
git show cfb3312 --stat

# 파일 하나 꺼내오기
git checkout cfb3312 -- demo/

# 그 시점 전체를 별도 브랜치로 복구
git checkout -b java-version cfb3312
```

Java 버전의 기능은 아래와 같이 옮겨졌습니다.

| Java 버전 | 현재 버전 |
|---|---|
| 입장 후 유예시간 경고 | ✅ 동일하게 동작 |
| 하루 출석 인정 기준 | ✅ 동일 (기준을 바꾸면 과거 기록에도 소급 적용) |
| 주간 출석 일수 미달 경고 | ✅ 대상을 "지난주 참여자"로 한정 |
| 누적 경고 3회 시 **자동 강퇴** | ⚠️ **강퇴하지 않고 관리자에게 알림만** |
| 일요일 23:55 주간 정산 | ✅ 월요일 자정으로 변경 (일요일 기록 반영 버그 수정) |
| PostgreSQL 영구 저장 | JSON 파일로 대체 |
| 설정을 `application.yml` 에 고정 | ✅ `/rule set` 명령어로 서버마다 조정 |

---

## 라이선스

MIT
