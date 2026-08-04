import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  time,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';
import { requireGuild } from '../utils/permissions';

/** 역할 멘션을 너무 많이 뿌리지 않도록 표시 개수 제한 */
const MAX_ROLES_SHOWN = 10;

const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('유저 정보를 조회합니다.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('정보를 조회할 유저 (비우면 본인)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = requireGuild(interaction);

    const targetUser = interaction.options.getUser('user') ?? interaction.user;

    // 캐시에 없을 수 있으므로 fetch. 서버에 없는 유저면 null 로 처리한다.
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    const roles = member
      ? [...member.roles.cache.values()]
          .filter((role) => role.id !== guild.id) // @everyone 제외
          .sort((a, b) => b.position - a.position)
      : [];

    const roleText =
      roles.length === 0
        ? '없음'
        : roles
            .slice(0, MAX_ROLES_SHOWN)
            .map((role) => role.toString())
            .join(' ') +
          (roles.length > MAX_ROLES_SHOWN
            ? ` 외 ${roles.length - MAX_ROLES_SHOWN}개`
            : '');

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || COLORS.primary)
      .setTitle(`👤 ${targetUser.username} 님의 정보`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '유저', value: `${targetUser}`, inline: true },
        { name: '태그', value: targetUser.tag, inline: true },
        { name: '봇 여부', value: targetUser.bot ? '예' : '아니오', inline: true },
        {
          name: '계정 생성일',
          value: `${time(targetUser.createdAt, 'D')} (${time(targetUser.createdAt, 'R')})`,
          inline: false,
        },
        {
          name: '서버 참여일',
          value: member?.joinedAt
            ? `${time(member.joinedAt, 'D')} (${time(member.joinedAt, 'R')})`
            : '이 서버에 없는 유저예요',
          inline: false,
        },
        {
          name: '서버 닉네임',
          value: member?.nickname ?? '없음',
          inline: true,
        },
        {
          name: '최고 역할',
          value: roles[0]?.toString() ?? '없음',
          inline: true,
        },
        {
          name: `역할 (${roles.length}개)`,
          value: roleText,
          inline: false,
        },
      )
      .setFooter({ text: `ID: ${targetUser.id}` })
      .setTimestamp();

    // 서버 부스터면 추가 정보
    if (member?.premiumSince) {
      embed.addFields({
        name: '서버 부스트 시작',
        value: time(member.premiumSince, 'R'),
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default userinfo;
