import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';
import { requireGuild } from '../utils/permissions';
import { formatRankLines, rankByDays, rankByTotal } from '../services/ranking';
import {
  formatDuration,
  lastWeekDateKeys,
  toDateKey,
  weekDateKeys,
  yesterdayDateKey,
} from '../utils/time';

const TOP_N = 10;

type Period = 'today' | 'yesterday' | 'week' | 'lastweek' | 'total';

const PERIOD_LABELS: Record<Period, string> = {
  today: '오늘',
  yesterday: '어제',
  week: '이번 주 (월~)',
  lastweek: '지난주',
  total: '전체 누적',
};

const ranking: Command = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('화면공유 시간 랭킹을 보여줍니다.')
    .addStringOption((option) =>
      option
        .setName('period')
        .setDescription('집계 기간 (기본: 오늘)')
        .addChoices(
          { name: '오늘', value: 'today' },
          { name: '어제', value: 'yesterday' },
          { name: '이번 주', value: 'week' },
          { name: '지난주', value: 'lastweek' },
          { name: '전체 누적', value: 'total' },
        )
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = requireGuild(interaction);

    const period = (interaction.options.getString('period') ?? 'today') as Period;
    const now = Date.now();

    // 과거 기간에는 "진행 중인 세션" 시간을 더하면 안 된다. (그건 오늘 몫)
    const rows =
      period === 'today'
        ? rankByDays(guild.id, [toDateKey(now)], true, now)
        : period === 'yesterday'
          ? rankByDays(guild.id, [yesterdayDateKey(now)], false, now)
          : period === 'week'
            ? rankByDays(guild.id, weekDateKeys(now), true, now)
            : period === 'lastweek'
              ? rankByDays(guild.id, lastWeekDateKeys(now), false, now)
              : rankByTotal(guild.id, now);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`🏆 화면공유 랭킹 — ${PERIOD_LABELS[period]}`)
      .setFooter({ text: `${guild.name} · 기준: 한국 시간 자정` })
      .setTimestamp();

    if (rows.length === 0) {
      embed.setDescription('해당 기간에는 기록이 없어요.');
    } else {
      embed.setDescription(formatRankLines(rows, formatDuration, TOP_N));
      const totalMs = rows.reduce((sum, row) => sum + row.ms, 0);
      embed.addFields(
        { name: '참여 인원', value: `${rows.length}명`, inline: true },
        { name: '총 시간', value: formatDuration(totalMs), inline: true },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default ranking;
