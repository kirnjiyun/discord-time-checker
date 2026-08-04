import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { successEmbed, warningEmbed } from '../utils/embeds';
import { CommandError } from '../utils/errors';
import {
  requireBotPermission,
  requireGuild,
  requireMemberPermission,
} from '../utils/permissions';
import { getSettings, updateSettings } from '../services/screenShareStore';
import {
  buildDailyReport,
  buildWeeklyReport,
  buildWeeklyWarningReport,
} from '../services/reportScheduler';

const ALLOWED_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
] as const;

const report: Command = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('화면공유 자동 결산 공지를 설정합니다. (서버 관리 권한 필요)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('결산을 올릴 채널을 지정합니다.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('결산 공지를 올릴 채널')
            .addChannelTypes(...ALLOWED_CHANNEL_TYPES)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('off').setDescription('자동 결산 공지를 끕니다.'),
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('현재 설정을 확인합니다.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('자정을 기다리지 않고 결산을 지금 미리 봅니다.'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild, member } = requireGuild(interaction);
    requireMemberPermission(member, PermissionFlagsBits.ManageGuild);

    const subcommand = interaction.options.getSubcommand();
    const settings = getSettings(guild.id);

    if (subcommand === 'set') {
      const channel = interaction.options.getChannel('channel', true, [
        ...ALLOWED_CHANNEL_TYPES,
      ]);

      requireBotPermission(guild, channel, [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ]);

      updateSettings(guild.id, { reportChannelId: channel.id });

      await interaction.reply({
        embeds: [
          successEmbed(
            `매일 **한국시간 자정**에 ${channel} 채널로 어제의 화면공유 결산을 올릴게요.\n` +
              '월요일에는 지난주 결산도 함께 올라갑니다.\n\n' +
              '`/report test` 로 지금 미리 볼 수 있어요.',
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'off') {
      if (!settings.reportChannelId) {
        throw new CommandError('자동 결산 공지가 이미 꺼져 있어요.');
      }

      updateSettings(guild.id, { reportChannelId: undefined });

      await interaction.reply({
        embeds: [successEmbed('자동 결산 공지를 껐어요. 기록은 그대로 쌓입니다.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'status') {
      const description = settings.reportChannelId
        ? `자동 결산 **켜짐** — <#${settings.reportChannelId}> 채널, 매일 한국시간 자정`
        : '자동 결산 **꺼짐** — `/report set` 으로 채널을 지정해 주세요.';

      await interaction.reply({
        embeds: [warningEmbed(description).setTitle('⚙️ 결산 설정')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // test — 지금 시점 기준으로 "어제 / 지난주" 결산을 미리 보여준다.
    const now = Date.now();
    // settle 인자를 주지 않으므로 출석일/경고가 실제로 바뀌지는 않는다.
    const daily = buildDailyReport(guild.id, now);
    const weekly = buildWeeklyReport(guild.id, now);
    const warning = buildWeeklyWarningReport(guild.id, now);

    if (!daily && !weekly && !warning) {
      throw new CommandError(
        '아직 결산할 기록이 없어요.\n음성채널에서 화면공유를 켠 뒤 다시 시도해 주세요.',
      );
    }

    await interaction.reply({
      embeds: [daily, weekly, warning].filter((embed) => embed !== null),
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default report;
