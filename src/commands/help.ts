import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { COLORS } from '../utils/embeds';

/**
 * 명령어 목록은 여기 한 곳에서만 관리한다.
 * 새 명령어를 추가하면 이 배열에도 한 줄 추가할 것.
 */
const GENERAL_COMMANDS = [
  { name: '/ping', description: '봇 상태와 응답 속도를 확인해요.' },
  { name: '/hello', description: '봇이 인사해요.' },
  { name: '/help', description: '사용 가능한 명령어 목록을 보여줘요.' },
  { name: '/userinfo [user]', description: '유저 정보를 조회해요. (비우면 본인)' },
  { name: '/serverinfo', description: '현재 서버 정보를 조회해요.' },
  { name: '/embed', description: 'embed 메시지를 만들어 보내요.' },
];

const STUDY_COMMANDS = [
  { name: '/warning show [user]', description: '경고·출석 현황을 확인해요.' },
  { name: '/warning reset <user>', description: '경고를 초기화해요. **서버 관리** 권한 필요.' },
  { name: '/rule show|set|on|off', description: '유예시간·출석기준·경고 규칙을 설정해요. **서버 관리** 권한 필요.' },
];

const SCREENSHARE_COMMANDS = [
  { name: '/screentime [user]', description: '화면공유 누적 시간을 조회해요.' },
  { name: '/ranking [period]', description: '랭킹을 보여줘요. (오늘/어제/이번주/지난주/전체)' },
  { name: '/live', description: '지금 화면공유 중인 사람을 보여줘요.' },
];

const MODERATION_COMMANDS = [
  {
    name: '/clear <amount> [user]',
    description: '메시지를 일괄 삭제해요. **메시지 관리** 권한 필요.',
  },
  {
    name: '/announce <channel> <message>',
    description: '지정한 채널에 공지를 보내요. **메시지 관리** 권한 필요.',
  },
  {
    name: '/report set|off|status|test',
    description: '자정 자동 결산 공지를 설정해요. **서버 관리** 권한 필요.',
  },
];

const toField = (list: { name: string; description: string }[]) =>
  list.map((c) => `\`${c.name}\`\n└ ${c.description}`).join('\n');

const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('사용 가능한 명령어 목록을 안내합니다.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📖 명령어 목록')
      .setDescription('아래 명령어를 사용할 수 있어요.')
      .addFields(
        { name: '🟢 일반', value: toField(GENERAL_COMMANDS) },
        { name: '🖥️ 화면공유 시간', value: toField(SCREENSHARE_COMMANDS) },
        { name: '📋 스터디 규칙', value: toField(STUDY_COMMANDS) },
        { name: '🛠️ 관리', value: toField(MODERATION_COMMANDS) },
      )
      .setFooter({ text: '권한이 없는 명령어는 목록에서 보이지 않을 수 있어요.' })
      .setTimestamp();

    // 채널을 어지럽히지 않도록 본인에게만 보이게 응답
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default help;
