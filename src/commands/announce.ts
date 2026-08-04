import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLOR_CHOICES, resolveColor, successEmbed } from '../utils/embeds';
import {
  requireBotPermission,
  requireGuild,
  requireMemberPermission,
} from '../utils/permissions';

const MAX_TITLE = 256;
const MAX_CONTENT = 4000;

/** 공지를 보낼 수 있는 채널 종류 */
const ALLOWED_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
] as const;

const announce: Command = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('지정한 채널에 공지를 전송합니다. (메시지 관리 권한 필요)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('공지를 보낼 채널')
        .addChannelTypes(...ALLOWED_CHANNEL_TYPES)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('공지 내용 (\\n 을 입력하면 줄바꿈)')
        .setMaxLength(MAX_CONTENT)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('title')
        .setDescription('공지 제목 (기본: 📢 공지사항)')
        .setMaxLength(MAX_TITLE)
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('공지 색상 (기본: 파랑)')
        .addChoices(...COLOR_CHOICES)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild, member } = requireGuild(interaction);

    // 유저 권한 검사 (setDefaultMemberPermissions 는 덮어쓰기 가능하므로 재검사)
    requireMemberPermission(member, PermissionFlagsBits.ManageMessages);

    const channel = interaction.options.getChannel('channel', true, [
      ...ALLOWED_CHANNEL_TYPES,
    ]);

    // 봇 권한 검사: 채널 보기 + 메시지 보내기 + 링크 첨부(embed 전송에 필수)
    requireBotPermission(guild, channel, [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ]);

    const content = interaction.options
      .getString('message', true)
      .replace(/\\n/g, '\n');
    const title = interaction.options.getString('title') ?? '📢 공지사항';
    const color = resolveColor(interaction.options.getString('color'));

    const announcement = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(content)
      .setFooter({
        text: `작성자: ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    // 외부 채널로 전송하는 작업이므로 응답을 먼저 지연시켜 둔다.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sent = await channel.send({ embeds: [announcement] });

    await interaction.editReply({
      embeds: [successEmbed(`${channel} 채널에 공지를 전송했어요.\n[공지 바로가기](${sent.url})`)],
    });
  },
};

export default announce;
