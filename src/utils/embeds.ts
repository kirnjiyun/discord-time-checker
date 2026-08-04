import { EmbedBuilder } from 'discord.js';

/** 프로젝트 전역에서 쓰는 임베드 색상 (Discord 기본 팔레트 기준) */
export const COLORS = {
  primary: 0x5865f2, // 블러플
  success: 0x57f287, // 초록
  warning: 0xfee75c, // 노랑
  danger: 0xed4245, // 빨강
  grey: 0x99aab5, // 회색
} as const;

export type ColorKey = keyof typeof COLORS;

/** /embed, /announce 의 color 옵션에서 재사용하는 선택지 */
export const COLOR_CHOICES: { name: string; value: ColorKey }[] = [
  { name: '파랑 (기본)', value: 'primary' },
  { name: '초록', value: 'success' },
  { name: '노랑', value: 'warning' },
  { name: '빨강', value: 'danger' },
  { name: '회색', value: 'grey' },
];

/** 옵션으로 받은 문자열을 실제 색상 값으로 변환. 잘못된 값이면 primary */
export function resolveColor(key: string | null): number {
  if (key && key in COLORS) {
    return COLORS[key as ColorKey];
  }
  return COLORS.primary;
}

/** 실패 메시지용 임베드 */
export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('❌ 실행할 수 없어요')
    .setDescription(message);
}

/** 성공 메시지용 임베드 */
export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('✅ 완료')
    .setDescription(message);
}

/** 주의/안내 메시지용 임베드 */
export function warningEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⚠️ 안내')
    .setDescription(message);
}
