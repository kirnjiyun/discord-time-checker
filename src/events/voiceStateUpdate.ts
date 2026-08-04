import { Events, VoiceState } from 'discord.js';
import { startSession, stopSession } from '../services/screenShareTracker';
import { formatDuration } from '../utils/time';

/**
 * 화면공유(Go Live) 시작/종료를 감지한다.
 *
 * VoiceState.streaming 은 "화면공유 중인가"를 뜻한다.
 * (카메라는 selfVideo 라서 여기서는 세지 않는다)
 *
 * 주의: 이 이벤트를 받으려면 index.ts 에 GuildVoiceStates 인텐트가 필요하다.
 */
export default {
  name: Events.VoiceStateUpdate,
  once: false,

  execute(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;
    const userId = member.id;

    const wasStreaming = oldState.streaming === true;
    const isStreaming = newState.streaming === true;

    if (!wasStreaming && isStreaming) {
      const channelId = newState.channelId ?? '';
      startSession(guildId, userId, channelId);
      console.log(`🔴 화면공유 시작: ${member.user.tag}`);
      return;
    }

    // 공유를 끄거나, 공유 중에 채널을 나가면(둘 다 streaming=false) 여기로 온다.
    if (wasStreaming && !isStreaming) {
      const elapsed = stopSession(guildId, userId);
      console.log(`⚪️ 화면공유 종료: ${member.user.tag} (${formatDuration(elapsed)})`);
    }
  },
};
