# discord-time-checker

디스코드 화면공유 타임체크용 봇 (Spring Boot + JDA)

음성 채널에서의 화면 공유 시간을 측정해 일일/주간 출석을 정산하고, 화면 공유를 켜지 않는 유저에게 유예 시간 후 경고를 보내며, 누적 경고 시 자동 강퇴하는 디스코드 봇입니다.

## 스택
- Java 21, Spring Boot, Spring Data JPA, PostgreSQL
- JDA (Java Discord API) 5.0.0-beta.20

## 로컬 개발

```bash
cd demo
cp .env.example .env   # DISCORD_BOT_TOKEN, STUDY_VOICE_CHANNEL_ID, NOTIFY_TEXT_CHANNEL_ID 채우기
docker compose up -d   # 로컬 PostgreSQL 기동
export $(grep -v '^#' .env | xargs)
./gradlew bootRun
```

Discord Developer Portal에서 봇 애플리케이션의 **Privileged Gateway Intents**에서 `SERVER MEMBERS INTENT`를 활성화해야 합니다.

## 설정값 (`discord.*`, application.yml)

| 키 | 설명 | 기본값 |
|---|---|---|
| `discord.bot-token` | 봇 토큰 | (필수) |
| `discord.study-voice-channel-id` | 감시할 스터디 음성 채널 ID | (필수) |
| `discord.notify-channel-id` | 경고/정산 메시지를 보낼 텍스트 채널 ID | (필수) |
| `discord.grace-period-minutes` | 입장 후 화면 공유 유예 시간(분) | 3 |
| `discord.attendance-threshold-minutes` | 출석 인정 최소 공부 시간(분) | 60 |
| `discord.weekly-required-days` | 주간 출석 요구 일수 | 3 |
| `discord.max-warnings-before-kick` | 자동 강퇴 기준 누적 경고 횟수 | 3 |

## 배포 (AWS EC2, Ubuntu)

t2.micro(1GB RAM)에서는 스왑이 없으면 OOM으로 죽을 수 있어, 배포 전 스왑을 반드시 설정합니다.

```bash
git clone <repo-url> discord-time-checker
cd discord-time-checker/demo
./deploy/setup-swap.sh          # 2GB 스왑 파일 생성
./gradlew bootJar                # build/libs/demo-0.0.1-SNAPSHOT.jar 생성
cp .env.example .env && vi .env  # 운영 값 채우기
sudo cp deploy/study-bot.service /etc/systemd/system/study-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now study-bot
sudo systemctl status study-bot
```

PostgreSQL은 RDS를 쓰거나 `docker compose up -d`로 EC2 내부에 띄웁니다. `study-bot.service`는 `.env`를 `EnvironmentFile`로 읽고, JVM 힙을 `-Xmx400m`으로 제한해 저사양 인스턴스에서도 동작하도록 되어 있습니다. 재부팅 후에도 자동 기동되도록 `systemctl enable`이 되어 있는지 확인하세요.
