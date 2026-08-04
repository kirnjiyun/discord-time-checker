import { Client, Events } from 'discord.js';
import { startSession } from '../services/screenShareTracker';
import { resumeWaiting } from '../services/graceWatcher';

/**
 * 봇이 켜졌을 때, 이미 화면공유를 켜 둔 사람이 있으면
 * 그 시점부터 다시 세션을 시작한다. (봇 재시작 대응)
 *
 * 봇이 꺼져 있던 동안의 시간은 알 수 없으므로 세지 않는다.
 */
function resumeActiveStreams(client: Client<true>): number {
  let resumed = 0;

  for (const guild of client.guilds.cache.values()) {
    for (const voiceState of guild.voiceStates.cache.values()) {
      if (voiceState.streaming !== true) continue;
      if (voiceState.member?.user.bot) continue;

      startSession(guild.id, voiceState.id, voiceState.channelId ?? '');
      resumed += 1;
    }
  }

  return resumed;
}

export default {
  name: Events.ClientReady,
  once: true, // 봇 실행 시 한 번만 발생

  execute(client: Client<true>) {
    console.log(`\n✅ 로그인 완료: ${client.user.tag}`);
    console.log(`🏠 참여 중인 서버: ${client.guilds.cache.size}개`);

    const resumed = resumeActiveStreams(client);
    if (resumed > 0) {
      console.log(`🔴 이미 화면공유 중인 ${resumed}명의 기록을 이어서 시작합니다.`);
    }

    const waiting = resumeWaiting(client);
    if (waiting > 0) {
      console.log(`👀 스터디 채널 대기자 ${waiting}명을 감시 목록에 넣었습니다.`);
    }

    console.log('   (명령어가 안 보이면 npm run deploy 를 실행했는지 확인하세요)\n');
  },
};
