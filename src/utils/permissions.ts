import {
  ChatInputCommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  PermissionFlagsBits,
  PermissionsBitField,
} from 'discord.js';
import { CommandError } from './errors';

/**
 * 권한 비트 -> 한글 라벨.
 * 에러 메시지를 "MANAGE_MESSAGES 권한 없음" 대신
 * "메시지 관리 권한이 필요해요" 로 보여주기 위한 매핑.
 */
const PERMISSION_LABELS = new Map<bigint, string>([
  [PermissionFlagsBits.Administrator, '서버 관리자'],
  [PermissionFlagsBits.ManageGuild, '서버 관리'],
  [PermissionFlagsBits.ManageMessages, '메시지 관리'],
  [PermissionFlagsBits.ViewChannel, '채널 보기'],
  [PermissionFlagsBits.SendMessages, '메시지 보내기'],
  [PermissionFlagsBits.EmbedLinks, '링크 첨부'],
  [PermissionFlagsBits.ReadMessageHistory, '메시지 기록 보기'],
]);

/** 권한 비트를 사람이 읽을 수 있는 문자열로 변환 */
export function labelOf(permission: bigint): string {
  const known = PERMISSION_LABELS.get(permission);
  if (known) return known;
  // 매핑에 없으면 discord.js 가 주는 영문 이름으로 대체
  return new PermissionsBitField(permission).toArray().join(', ');
}

/**
 * 서버(길드) 전용 명령어 가드.
 * DM 에서 실행되면 CommandError 를 던진다.
 *
 * inCachedGuild() 는 타입 가드라서, 통과하면 guild / member 가
 * null 이 아님이 타입 레벨에서 보장된다.
 */
export function requireGuild(interaction: ChatInputCommandInteraction): {
  guild: Guild;
  member: GuildMember;
} {
  if (!interaction.inCachedGuild()) {
    throw new CommandError('이 명령어는 서버 안에서만 사용할 수 있어요.');
  }
  return { guild: interaction.guild, member: interaction.member };
}

/** 명령어를 실행한 "유저"의 권한 검사 */
export function requireMemberPermission(
  member: GuildMember,
  permission: bigint,
): void {
  if (!member.permissions.has(permission)) {
    throw new CommandError(
      `이 명령어를 사용하려면 **${labelOf(permission)}** 권한이 필요해요.`,
    );
  }
}

/**
 * "봇"이 특정 채널에서 해당 권한을 가지고 있는지 검사.
 * 서버 전체 권한이 있어도 채널별 권한 덮어쓰기로 막히는 경우가 많아
 * 반드시 channel.permissionsFor() 로 확인해야 한다. (자주 하는 실수 포인트)
 */
export function requireBotPermission(
  guild: Guild,
  channel: GuildBasedChannel,
  permissions: bigint[],
): void {
  const me = guild.members.me;
  if (!me) {
    throw new CommandError('봇 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const channelPermissions = channel.permissionsFor(me);
  const missing = permissions.filter((p) => !channelPermissions?.has(p));

  if (missing.length > 0) {
    throw new CommandError(
      `봇에게 ${channel} 채널의 **${missing.map(labelOf).join(', ')}** 권한이 없어요.\n` +
        '서버 설정 → 채널 권한에서 봇 역할에 권한을 추가해 주세요.',
    );
  }
}
