import path from 'node:path';
import { REST, Routes } from 'discord.js';
import { config } from './config';
import { findModuleFiles, loadModule } from './loader';
import { Command } from './types/command';

/**
 * 슬래시 명령어를 Discord 에 등록하는 스크립트.
 *
 * 명령어를 추가하거나 이름/옵션을 바꿨다면 반드시 다시 실행해야 한다.
 *   npm run deploy
 */
async function main(): Promise<void> {
  const files = findModuleFiles(path.join(__dirname, 'commands'));
  const body = [];

  for (const file of files) {
    const command = loadModule<Command>(file);
    if (!command?.data) continue;
    body.push(command.data.toJSON());
  }

  console.log(`📤 ${body.length}개 명령어 등록 시도: ${body.map((c) => c.name).join(', ')}`);

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    if (config.guildId) {
      // 길드(서버) 전용 등록 — 즉시 반영되므로 개발 중에는 이쪽을 쓴다.
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body },
      );
      console.log(`✅ 서버(${config.guildId})에 등록 완료 — 즉시 반영돼요.`);
    } else {
      // 전역 등록 — 모든 서버에 적용되지만 최대 1시간까지 걸린다.
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log('✅ 전역 등록 완료 — 반영까지 최대 1시간 걸릴 수 있어요.');
    }
  } catch (error) {
    console.error('\n❌ 명령어 등록 실패');
    console.error('   DISCORD_CLIENT_ID / DISCORD_GUILD_ID 가 올바른지,');
    console.error('   봇이 해당 서버에 초대되어 있는지 확인해 주세요.\n');
    console.error(error);
    process.exit(1);
  }
}

main();
