import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS, successEmbed } from '../utils/embeds';
import { CommandError } from '../utils/errors';
import { requireGuild, requireMemberPermission } from '../utils/permissions';
import { getRules, updateRules } from '../services/screenShareStore';

const rule: Command = {
  data: new SlashCommandBuilder()
    .setName('rule')
    .setDescription('스터디 운영 규칙(유예시간·출석기준·경고)을 설정합니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('show').setDescription('현재 규칙을 확인합니다.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('규칙을 변경합니다. 바꿀 항목만 입력하세요.')
        .addChannelOption((option) =>
          option
            .setName('studychannel')
            .setDescription('감시할 스터디 음성채널')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(false),
        )
        .addChannelOption((option) =>
          option
            .setName('notifychannel')
            .setDescription('경고·정산 알림을 보낼 텍스트채널')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('grace')
            .setDescription('입장 후 화면공유까지 봐주는 시간(분)')
            .setMinValue(1)
            .setMaxValue(120)
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('attendance')
            .setDescription('하루 출석 인정 최소 시간(분)')
            .setMinValue(1)
            .setMaxValue(1440)
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('weeklydays')
            .setDescription('한 주에 채워야 하는 출석 일수')
            .setMinValue(1)
            .setMaxValue(7)
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName('maxwarnings')
            .setDescription('강퇴 검토 대상이 되는 누적 경고 횟수')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('on').setDescription('유예시간 경고와 주간 출석 경고를 켭니다.'),
    )
    .addSubcommand((sub) =>
      sub.setName('off').setDescription('스터디 규칙 기능을 끕니다.'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild, member } = requireGuild(interaction);
    requireMemberPermission(member, PermissionFlagsBits.ManageGuild);

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'on' || subcommand === 'off') {
      const enabled = subcommand === 'on';

      if (enabled && !getRules(guild.id).studyChannelId) {
        throw new CommandError(
          '먼저 감시할 스터디 음성채널을 지정해 주세요.\n`/rule set studychannel:<채널>`',
        );
      }

      updateRules(guild.id, { enabled });

      await interaction.reply({
        embeds: [
          successEmbed(
            enabled
              ? '스터디 규칙을 켰어요. 유예시간 경고와 주간 출석 경고가 동작합니다.'
              : '스터디 규칙을 껐어요. 화면공유 시간 집계는 그대로 계속됩니다.',
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (subcommand === 'set') {
      const studyChannel = interaction.options.getChannel('studychannel');
      const notifyChannel = interaction.options.getChannel('notifychannel');
      const grace = interaction.options.getInteger('grace');
      const attendance = interaction.options.getInteger('attendance');
      const weeklyDays = interaction.options.getInteger('weeklydays');
      const maxWarnings = interaction.options.getInteger('maxwarnings');

      const changes: string[] = [];

      if (studyChannel) changes.push(`감시 채널 → ${studyChannel}`);
      if (notifyChannel) changes.push(`알림 채널 → ${notifyChannel}`);
      if (grace !== null) changes.push(`유예시간 → ${grace}분`);
      if (attendance !== null) changes.push(`출석 기준 → ${attendance}분`);
      if (weeklyDays !== null) changes.push(`주간 요구 일수 → ${weeklyDays}일`);
      if (maxWarnings !== null) changes.push(`강퇴 검토 기준 → 경고 ${maxWarnings}회`);

      if (changes.length === 0) {
        throw new CommandError('변경할 항목을 하나 이상 입력해 주세요.');
      }

      updateRules(guild.id, {
        ...(studyChannel ? { studyChannelId: studyChannel.id } : {}),
        ...(notifyChannel ? { notifyChannelId: notifyChannel.id } : {}),
        ...(grace !== null ? { gracePeriodMinutes: grace } : {}),
        ...(attendance !== null ? { attendanceThresholdMinutes: attendance } : {}),
        ...(weeklyDays !== null ? { weeklyRequiredDays: weeklyDays } : {}),
        ...(maxWarnings !== null ? { maxWarningsBeforeKick: maxWarnings } : {}),
      });

      const rules = getRules(guild.id);
      const hint = rules.enabled ? '' : '\n\n아직 규칙이 꺼져 있어요. `/rule on` 으로 켜주세요.';

      await interaction.reply({
        embeds: [successEmbed(`${changes.join('\n')}${hint}`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // show
    const rules = getRules(guild.id);

    const embed = new EmbedBuilder()
      .setColor(rules.enabled ? COLORS.success : COLORS.grey)
      .setTitle('📋 스터디 운영 규칙')
      .setDescription(rules.enabled ? '✅ **켜짐**' : '⛔️ **꺼짐** — `/rule on` 으로 켤 수 있어요.')
      .addFields(
        {
          name: '감시 스터디 채널',
          value: rules.studyChannelId ? `<#${rules.studyChannelId}>` : '미지정',
          inline: true,
        },
        {
          name: '알림 채널',
          value: rules.notifyChannelId
            ? `<#${rules.notifyChannelId}>`
            : '미지정 (결산 채널 사용)',
          inline: true,
        },
        { name: '유예시간', value: `${rules.gracePeriodMinutes}분`, inline: true },
        {
          name: '출석 인정 기준',
          value: `하루 ${rules.attendanceThresholdMinutes}분 이상`,
          inline: true,
        },
        {
          name: '주간 요구 출석',
          value: `${rules.weeklyRequiredDays}일`,
          inline: true,
        },
        {
          name: '강퇴 검토 기준',
          value: `누적 경고 ${rules.maxWarningsBeforeKick}회`,
          inline: true,
        },
      )
      .setFooter({ text: '봇은 강퇴를 실행하지 않고 관리자에게 알리기만 합니다.' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default rule;
