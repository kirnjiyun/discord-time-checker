import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('봇 상태와 응답 속도를 확인합니다.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const startedAt = Date.now();
    await interaction.deferReply();
    const roundtrip = Date.now() - startedAt;

    // ws.ping 은 연결 직후 -1 이 나올 수 있다.
    const websocket = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '응답 속도', value: `${roundtrip}ms`, inline: true },
        {
          name: '게이트웨이',
          value: websocket < 0 ? '측정 중...' : `${websocket}ms`,
          inline: true,
        },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default ping;
