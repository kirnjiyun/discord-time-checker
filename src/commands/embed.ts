import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLOR_CHOICES, resolveColor } from '../utils/embeds';
import { CommandError } from '../utils/errors';

/** Discord embed 필드별 최대 길이 (초과하면 API 400 에러) */
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4000;

const embed: Command = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('입력한 내용을 embed 메시지로 보냅니다.')
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('embed 제목')
        .setMaxLength(MAX_TITLE)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('embed 본문 (\\n 을 입력하면 줄바꿈)')
        .setMaxLength(MAX_DESCRIPTION)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('embed 색상 (기본: 파랑)')
        .addChoices(...COLOR_CHOICES)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('image')
        .setDescription('본문 아래에 넣을 이미지 URL (http/https)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString('title', true);
    // 슬래시 명령어 입력창에서는 실제 줄바꿈을 못 넣으므로 \n 을 치환해 준다.
    const description = interaction.options
      .getString('description', true)
      .replace(/\\n/g, '\n');
    const color = resolveColor(interaction.options.getString('color'));
    const imageUrl = interaction.options.getString('image');

    const result = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: `작성자: ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (imageUrl) {
      // 잘못된 URL 을 그대로 넘기면 Discord API 가 400 을 반환하므로 미리 검사
      if (!/^https?:\/\//i.test(imageUrl)) {
        throw new CommandError(
          '이미지 URL 은 `http://` 또는 `https://` 로 시작해야 해요.',
        );
      }
      result.setImage(imageUrl);
    }

    await interaction.reply({ embeds: [result] });
  },
};

export default embed;
