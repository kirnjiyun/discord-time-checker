import path from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from './config';
import { findModuleFiles, loadModule } from './loader';
import { Command } from './types/command';
import { loadStore, saveStore } from './services/screenShareStore';
import { shutdownTracker, startAutoFlush } from './services/screenShareTracker';
import { startReportScheduler, stopReportScheduler } from './services/reportScheduler';
import { startGraceWatcher, stopGraceWatcher } from './services/graceWatcher';

/** 이벤트 파일이 export 해야 하는 형태 */
interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => void | Promise<void>;
}

const client = new Client({
  intents: [
    // 슬래시 명령어 동작에 필요
    GatewayIntentBits.Guilds,
    // 화면공유 감지(voiceStateUpdate)에 필요.
    // 특권 인텐트가 아니라서 Developer Portal 에서 따로 켤 필요는 없다.
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection<string, Command>();

/** src/commands 폴더의 모든 명령어를 자동 등록 */
function registerCommands(): void {
  const files = findModuleFiles(path.join(__dirname, 'commands'));

  for (const file of files) {
    const command = loadModule<Command>(file);

    if (!command?.data || typeof command.execute !== 'function') {
      console.warn(`⚠️  건너뜀: ${path.basename(file)} — data 또는 execute 가 없어요.`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  console.log(`📦 명령어 ${client.commands.size}개 로드 완료`);
}

/** src/events 폴더의 모든 이벤트를 자동 등록 */
function registerEvents(): void {
  const files = findModuleFiles(path.join(__dirname, 'events'));

  for (const file of files) {
    const event = loadModule<BotEvent>(file);

    if (!event?.name || typeof event.execute !== 'function') {
      console.warn(`⚠️  건너뜀: ${path.basename(file)} — name 또는 execute 가 없어요.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  console.log(`🔔 이벤트 ${files.length}개 로드 완료`);
}

// 화면공유 누적 기록을 파일에서 읽어온다.
loadStore();

registerCommands();
registerEvents();

// 진행 중인 화면공유 시간을 1분마다 저장 (갑자기 죽어도 최대 1분만 손실)
startAutoFlush();

/** Control+C 등으로 종료할 때 진행 중인 시간까지 저장하고 끝낸다. */
function gracefulShutdown(signal: string): void {
  console.log(`\n🛑 ${signal} 수신 — 기록을 저장하고 종료합니다.`);
  stopReportScheduler();
  stopGraceWatcher();
  shutdownTracker();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 잡히지 않은 에러로 프로세스가 죽지 않도록 방어 (운영 시 로그 확인 포인트)
process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error);
  // 예상 못 한 에러가 나도 기록은 지켜낸다.
  saveStore(true);
});

// 로그인 이후에 자정 결산 스케줄러를 켠다.
client.once('clientReady', () => {
  startReportScheduler(client);
  startGraceWatcher(client);
});

client.login(config.token).catch((error) => {
  console.error('\n❌ 로그인 실패. DISCORD_TOKEN 이 올바른지 확인해 주세요.');
  console.error(error);
  process.exit(1);
});
