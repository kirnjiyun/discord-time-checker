import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

/**
 * 모든 슬래시 명령어가 지켜야 하는 형태.
 *
 * data 의 타입이 3개 유니온인 이유:
 * SlashCommandBuilder 에 .addXxxOption() 을 체이닝하면
 * 반환 타입이 SlashCommandOptionsOnlyBuilder 로 바뀌기 때문.
 * (여기를 SlashCommandBuilder 하나로만 두면 옵션 있는 명령어가 타입 에러남)
 */
export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
