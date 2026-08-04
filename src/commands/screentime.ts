import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  time,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';
import { requireGuild } from '../utils/permissions';
import { getUserRecord, sumDays } from '../services/screenShareStore';
import { getActiveSession, getPendingMs } from '../services/screenShareTracker';
import { formatDuration, toDateKey, weekDateKeys } from '../utils/time';

const screentime: Command = {
  data: new SlashCommandBuilder()
    .setName('screentime')
    .setDescription('화면공유 누적 시간을 조회합니다.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('조회할 유저 (비우면 본인)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = requireGuild(interaction);

    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const now = Date.now();

    const record = getUserRecord(guild.id, targetUser.id);
    // 아직 저장 전인 진행 중 세션의 시간도 더해서 보여준다.
    const pending = getPendingMs(guild.id, targetUser.id, now);

    const todayMs = (record.daily[toDateKey(now)] ?? 0) + pending;
    const weekMs = sumDays(record, weekDateKeys(now)) + pending;
    const totalMs = record.totalMs + pending;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`🖥️ ${targetUser.username} 님의 화면공유 시간`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '오늘', value: formatDuration(todayMs), inline: true },
        { name: '이번 주 (월~)', value: formatDuration(weekMs), inline: true },
        { name: '전체 누적', value: formatDuration(totalMs), inline: true },
      )
      .setFooter({ text: '기준: 한국 시간 자정' })
      .setTimestamp();

    const session = getActiveSession(guild.id, targetUser.id);
    if (session) {
      embed.setColor(COLORS.success);
      embed.setDescription(
        `🔴 **지금 화면공유 중** — ${time(Math.floor(session.sessionStartedAt / 1000), 'R')} 시작`,
      );
    }

    if (totalMs === 0) {
      embed.setDescription('아직 기록된 화면공유 시간이 없어요.');
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default screentime;
