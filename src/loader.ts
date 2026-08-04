import fs from 'node:fs';
import path from 'node:path';

/**
 * 폴더 안의 모듈 파일 경로를 모두 찾아준다.
 *
 * ts-node 로 실행하면 .ts, 빌드 후 실행하면 .js 가 되므로
 * 현재 실행 중인 파일의 확장자를 기준으로 걸러낸다. (자주 놓치는 부분)
 */
export function findModuleFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  const extension = path.extname(__filename); // '.ts' 또는 '.js'

  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(extension) && !file.endsWith(`.d${extension}`))
    .map((file) => path.join(directory, file));
}

/** default export 를 우선으로 모듈을 불러온다. */
export function loadModule<T>(filePath: string): T {
  // 동적으로 경로가 정해지므로 import 대신 require 사용
  const imported = require(filePath);
  return (imported.default ?? imported) as T;
}
