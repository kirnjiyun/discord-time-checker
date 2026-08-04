/**
 * 사용자에게 그대로 보여줘도 되는 "예상된 에러".
 *
 * 명령어 안에서 throw new CommandError('...') 를 하면
 * events/interactionCreate.ts 가 잡아서 예쁜 임베드로 응답해 준다.
 * 그 외의 에러(버그, 네트워크 오류 등)는 로그만 남기고
 * 사용자에게는 일반적인 문구만 보여준다. (내부 정보 노출 방지)
 */
export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}
