import { Collection } from 'discord.js';
import { Command } from './command';

/**
 * discord.js 의 Client 에 commands 속성을 추가한다.
 * 이 선언이 있어야 interaction.client.commands 가 타입 에러 없이 동작한다.
 */
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
