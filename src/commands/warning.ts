import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS, successEmbed } from '../utils/embeds';
import { requireGuild, requireMemberPermission } from '../utils/permissions';
import { getRules, getUserRecord, resetWarnings } from '../services/screenShareStore';
import { countThisWeekAttendance } from '../services/attendance';
import { formatDuration, weekDateKeys } from '../utils/time';
import { sumDays } from '../services/screenShareStore';

const warning: Command = {
  data: new SlashCommandBuilder()
    .setName('warning')
    .setDescription('출석 경고 현황을 확인하거나 초기화합니다.')
    .addSubcommand((sub) =>
      sub
        .setName('show')
        .setDescription('경고와 출석 현황을 확인합니다.')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('조회할 유저 (비우면 본인)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('경고를 초기화합니다. (서버 관리 권한 필요)')
        .addUserOption((option) =>
          option.setName('user').setDescription('초기화할 유저').setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild, member } = requireGuild(interaction);
    const rules = getRules(guild.id);

    if (interaction.options.getSubcommand() === 'reset') {
      requireMemberPermission(member, PermissionFlagsBits.ManageGuild);

      const targetUser = interaction.options.getUser('user', true);
      resetWarnings(guild.id, targetUser.id);

      await interaction.reply({
        embeds: [successEmbed(`${targetUser} 님의 누적 경고를 0회로 초기화했어요.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const now = Date.now();
    const record = getUserRecord(guild.id, targetUser.id);

    const warnings = record.warnings ?? 0;
    const attendanceDays = record.attendanceDays ?? 0;
    const thisWeekDays = countThisWeekAttendance(guild.id, targetUser.id, now);
    const thisWeekMs = sumDays(record, weekDateKeys(now));

    const remaining = Math.max(rules.weeklyRequiredDays - thisWeekDays, 0);

    const embed = new EmbedBuilder()
      .setColor(warnings >= rules.maxWarningsBeforeKick ? COLORS.danger : COLORS.primary)
      .setTitle(`📋 ${targetUser.username} 님의 출석 현황`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        {
          name: '누적 경고',
          value: `${warnings}회 / ${rules.maxWarningsBeforeKick}회`,
          inline: true,
        },
        { name: '누적 출석일', value: `${attendanceDays}일`, inline: true },
        {
          name: '이번 주 출석',
          value: `${thisWeekDays}일 / ${rules.weeklyRequiredDays}일`,
          inline: true,
        },
        { name: '이번 주 화면공유', value: formatDuration(thisWeekMs), inline: true },
      )
      .setFooter({
        text: `출석 인정: 하루 ${rules.attendanceThresholdMinutes}분 이상`,
      })
      .setTimestamp();

    if (!rules.enabled) {
      embed.setDescription('⛔️ 스터디 규칙이 꺼져 있어 경고가 부여되지 않습니다.');
    } else if (remaining > 0) {
      embed.setDescription(`이번 주 출석을 채우려면 **${remaining}일** 더 필요해요.`);
    } else {
      embed.setDescription('✅ 이번 주 출석 기준을 채웠어요!');
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default warning;
