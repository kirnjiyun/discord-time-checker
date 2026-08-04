import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  time,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';
import { requireGuild } from '../utils/permissions';
import { getActiveSessions } from '../services/screenShareTracker';
import { formatDuration } from '../utils/time';

const live: Command = {
  data: new SlashCommandBuilder()
    .setName('live')
    .setDescription('지금 화면공유 중인 사람을 보여줍니다.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = requireGuild(interaction);

    const now = Date.now();
    const sessions = getActiveSessions(guild.id);

    const embed = new EmbedBuilder()
      .setColor(sessions.length > 0 ? COLORS.success : COLORS.grey)
      .setTitle('🔴 실시간 화면공유 현황')
      .setTimestamp();

    if (sessions.length === 0) {
      embed.setDescription('지금 화면공유 중인 사람이 없어요.');
    } else {
      embed.setDescription(
        sessions
          .map((session) => {
            const elapsed = formatDuration(now - session.sessionStartedAt);
            const channel = session.channelId ? `<#${session.channelId}>` : '알 수 없는 채널';
            const startedAt = time(Math.floor(session.sessionStartedAt / 1000), 'R');
            return `• <@${session.userId}> — ${channel}\n  └ **${elapsed}** 경과 (${startedAt} 시작)`;
          })
          .join('\n'),
      );
      embed.setFooter({ text: `총 ${sessions.length}명` });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default live;
