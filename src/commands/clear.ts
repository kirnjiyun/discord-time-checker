import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types/command';
import { CommandError } from '../utils/errors';
import { successEmbed, warningEmbed } from '../utils/embeds';
import { requireGuild, requireMemberPermission } from '../utils/permissions';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100; // Discord bulkDelete 하드 리밋

const clear: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('채널의 메시지를 일괄 삭제합니다. (메시지 관리 권한 필요)')
    // 1차 방어선: Discord UI 자체에서 권한 없는 유저에게 명령어를 숨김.
    // 단, 서버 관리자가 이 설정을 덮어쓸 수 있으므로 execute 안에서 2차 검사도 한다.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`삭제할 메시지 개수 (${MIN_AMOUNT}~${MAX_AMOUNT})`)
        .setMinValue(MIN_AMOUNT)
        .setMaxValue(MAX_AMOUNT)
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('특정 유저의 메시지만 삭제 (선택)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guild, member } = requireGuild(interaction);

    // 2차 방어선: 실제 권한 재검사
    requireMemberPermission(member, PermissionFlagsBits.ManageMessages);

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      throw new CommandError('이 채널에서는 메시지를 삭제할 수 없어요.');
    }

    // 봇에게도 권한이 있어야 실제 삭제가 가능하다.
    const me = guild.members.me;
    const botPerms = me ? channel.permissionsFor(me) : null;
    if (!botPerms?.has(PermissionFlagsBits.ManageMessages)) {
      throw new CommandError(
        '봇에게 이 채널의 **메시지 관리** 권한이 없어요.\n서버 설정 → 채널 권한을 확인해 주세요.',
      );
    }

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');

    // 삭제 작업은 시간이 걸릴 수 있으므로 먼저 defer. (3초 룰 회피)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 유저 필터가 있으면 넉넉히 가져와서 걸러낸 뒤 amount 만큼 자른다.
    const fetched = await channel.messages.fetch({
      limit: targetUser ? MAX_AMOUNT : amount,
    });
    const targets = [...fetched.values()]
      .filter((message) => (targetUser ? message.author.id === targetUser.id : true))
      .slice(0, amount);

    if (targets.length === 0) {
      await interaction.editReply({
        embeds: [warningEmbed('삭제할 수 있는 메시지를 찾지 못했어요.')],
      });
      return;
    }

    // 두 번째 인자 true = 14일이 지난 메시지는 에러 대신 조용히 건너뜀
    const deleted = await channel.bulkDelete(targets, true);

    if (deleted.size === 0) {
      await interaction.editReply({
        embeds: [
          warningEmbed(
            '메시지를 하나도 삭제하지 못했어요.\nDiscord 정책상 **14일이 지난 메시지는 일괄 삭제할 수 없어요.**',
          ),
        ],
      });
      return;
    }

    const skipped = targets.length - deleted.size;
    const description =
      `메시지 **${deleted.size}개**를 삭제했어요.` +
      (targetUser ? `\n대상: ${targetUser}` : '') +
      (skipped > 0 ? `\n(14일이 지나 삭제하지 못한 메시지 ${skipped}개는 건너뛰었어요.)` : '');

    await interaction.editReply({ embeds: [successEmbed(description)] });
  },
};

export default clear;
