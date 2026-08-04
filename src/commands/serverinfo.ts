import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildVerificationLevel,
  SlashCommandBuilder,
  time,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';
import { requireGuild } from '../utils/permissions';

/** 보안 수준(인증 레벨) 한글 라벨 */
const VERIFICATION_LABELS: Record<GuildVerificationLevel, string> = {
  [GuildVerificationLevel.None]: '없음',
  [GuildVerificationLevel.Low]: '낮음 (이메일 인증)',
  [GuildVerificationLevel.Medium]: '중간 (가입 5분 경과)',
  [GuildVerificationLevel.High]: '높음 (서버 참여 10분 경과)',
  [GuildVerificationLevel.VeryHigh]: '매우 높음 (전화 인증)',
};

const serverinfo: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('현재 서버의 정보를 조회합니다.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = requireGuild(interaction);

    // 소유자는 캐시에 없을 수 있어서 fetch (실패해도 명령어 전체가 죽지 않게 catch)
    const owner = await guild.fetchOwner().catch(() => null);

    const channels = guild.channels.cache;
    const textCount = channels.filter(
      (c) =>
        c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement,
    ).size;
    const voiceCount = channels.filter(
      (c) =>
        c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice,
    ).size;
    const categoryCount = channels.filter(
      (c) => c.type === ChannelType.GuildCategory,
    ).size;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`🏠 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: '서버 소유자', value: owner ? `${owner.user.tag}` : '알 수 없음', inline: true },
        { name: '멤버 수', value: `${guild.memberCount}명`, inline: true },
        { name: '역할 수', value: `${guild.roles.cache.size}개`, inline: true },
        {
          name: '채널',
          value: `텍스트 ${textCount} · 음성 ${voiceCount} · 카테고리 ${categoryCount}`,
          inline: false,
        },
        { name: '이모지', value: `${guild.emojis.cache.size}개`, inline: true },
        {
          name: '부스트',
          value: `레벨 ${guild.premiumTier} (${guild.premiumSubscriptionCount ?? 0}개)`,
          inline: true,
        },
        {
          name: '보안 수준',
          value: VERIFICATION_LABELS[guild.verificationLevel] ?? '알 수 없음',
          inline: true,
        },
        {
          name: '서버 생성일',
          value: `${time(guild.createdAt, 'D')} (${time(guild.createdAt, 'R')})`,
          inline: false,
        },
      )
      .setFooter({ text: `서버 ID: ${guild.id}` })
      .setTimestamp();

    const banner = guild.bannerURL({ size: 1024 });
    if (banner) embed.setImage(banner);

    if (guild.description) embed.setDescription(guild.description);

    await interaction.reply({ embeds: [embed] });
  },
};

export default serverinfo;
