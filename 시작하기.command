#!/bin/bash
# 더블클릭하면 봇을 설치하고 실행합니다. (macOS 전용)

cd "$(dirname "$0")" || exit 1

# nvm 으로 Node 를 설치한 경우를 대비해 PATH 를 보강
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

pause_and_exit() {
  echo
  read -r -p "Enter 키를 누르면 창이 닫힙니다..."
  exit "${1:-0}"
}

echo "=================================="
echo "  Discord Bot 시작하기"
echo "=================================="
echo

# ── 1. Node.js 확인 ──────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js 를 찾을 수 없습니다."
  echo "   https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."
  pause_and_exit 1
fi
echo "✅ Node.js $(node -v) 확인"

# ── 2. .env 준비 ─────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 .env 파일을 만들었습니다."
fi

if grep -q "여기에_봇_토큰" .env; then
  echo
  echo "⚠️  봇 토큰이 아직 비어 있습니다."
  echo "   방금 열린 창에서 DISCORD_TOKEN= 뒤에 토큰을 붙여넣고"
  echo "   저장(Cmd+S)한 뒤 이 창으로 돌아와 주세요."
  echo
  echo "   토큰 발급: https://discord.com/developers/applications"
  echo "             → Bot → Reset Token"
  echo
  open -e .env
  read -r -p "저장을 마쳤으면 Enter 키를 누르세요..."

  if grep -q "여기에_봇_토큰" .env; then
    echo
    echo "❌ 토큰이 아직 채워지지 않았습니다. 저장(Cmd+S)을 했는지 확인해 주세요."
    pause_and_exit 1
  fi
fi
echo "✅ .env 확인"

# ── 3. 패키지 설치 ───────────────────────────────
if [ ! -d node_modules ]; then
  echo
  echo "📦 패키지를 설치합니다. (처음 한 번만, 1~2분 정도 걸려요)"
  npm install || { echo "❌ 설치 실패"; pause_and_exit 1; }
fi
echo "✅ 패키지 확인"

# ── 4. 슬래시 명령어 등록 ────────────────────────
echo
echo "📤 슬래시 명령어를 Discord 에 등록합니다..."
npm run deploy --silent || { echo "❌ 명령어 등록 실패 (위 메시지를 확인해 주세요)"; pause_and_exit 1; }

# ── 5. 봇 실행 ───────────────────────────────────
echo
echo "🚀 봇을 실행합니다."
echo "   이 창을 닫으면 봇도 꺼집니다. 종료하려면 Control+C 를 누르세요."
echo
npm run dev --silent

pause_and_exit 0
