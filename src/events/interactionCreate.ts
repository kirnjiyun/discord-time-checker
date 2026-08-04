import { Events, Interaction, MessageFlags } from 'discord.js';
import { errorEmbed } from '../utils/embeds';
import { CommandError } from '../utils/errors';

const GENERIC_ERROR_MESSAGE =
  '명령어를 실행하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    // 슬래시 명령어 외의 인터랙션(버튼, 셀렉트 등)은 여기서 처리하지 않는다.
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      // deploy-commands 실행 후 파일을 지운 경우 등에 발생
      console.warn(`[interactionCreate] 등록되지 않은 명령어: ${interaction.commandName}`);
      await interaction.reply({
        embeds: [errorEmbed('알 수 없는 명령어예요. 봇 관리자에게 문의해 주세요.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      // CommandError = 우리가 의도적으로 던진, 유저에게 보여줘도 되는 메시지
      const isExpected = error instanceof CommandError;

      if (!isExpected) {
        // 예상 못 한 에러만 로그로 남긴다. (운영 시 여기 로그를 확인할 것)
        console.error(`[command:${interaction.commandName}] 실행 실패`, error);
      }

      const embed = errorEmbed(isExpected ? error.message : GENERIC_ERROR_MESSAGE);

      // 이미 응답했는지 여부에 따라 응답 방식이 달라진다. (자주 하는 실수 포인트)
      try {
        if (interaction.deferred) {
          // editReply 에는 flags 를 넣을 수 없다 (defer 시점의 설정을 따라감)
          await interaction.editReply({ embeds: [embed] });
        } else if (interaction.replied) {
          await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        // 인터랙션 토큰 만료(15분) 등으로 응답 자체가 실패할 수 있다.
        console.error('[interactionCreate] 에러 응답 전송 실패', replyError);
      }
    }
  },
};
