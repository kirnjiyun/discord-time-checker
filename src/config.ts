import 'dotenv/config';

/**
 * 필수 환경변수를 읽어온다.
 * 값이 없으면 애매한 에러 대신 명확한 메시지를 띄우고 종료한다.
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '' || value.startsWith('여기에')) {
    console.error(`\n❌ 환경변수 ${name} 이(가) 설정되지 않았어요.`);
    console.error('   프로젝트 폴더의 .env 파일을 열어 값을 채워 주세요.');
    console.error('   (.env 파일이 없다면 .env.example 을 복사해서 만드세요)\n');
    process.exit(1);
  }

  return value.trim();
}

export const config = {
  /** 봇 토큰 — 절대 외부에 공유하지 말 것 */
  token: required('DISCORD_TOKEN'),
  /** 애플리케이션 ID (명령어 등록에 필요) */
  clientId: required('DISCORD_CLIENT_ID'),
  /** 개발용 서버 ID. 비어 있으면 전역(global) 명령어로 등록된다. */
  guildId: (process.env.DISCORD_GUILD_ID ?? '').trim().startsWith('여기에')
    ? ''
    : (process.env.DISCORD_GUILD_ID ?? '').trim(),
};
