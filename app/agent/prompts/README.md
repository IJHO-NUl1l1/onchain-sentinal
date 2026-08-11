# prompts/

`diagnoser.md` / `strategist.md` — **영어로 쓴다.** 원래는 내부 문서라 한국어여도 됐는데,
8/11부터 `app/agent/prompt.ts`가 이 파일들을 읽어서 실데이터와 합친 뒤 데모 콘솔(`run-console.tsx`)
3막에 그대로 노출한다 — 화면에 뜨는 순간 CLAUDE.md "밖으로 노출되는 것은 전부 영어" 규칙 적용 대상이다.

여전히 `diagnoser.ts`/`strategist.ts`(함수 바디)는 이 프롬프트를 자동으로 API 호출하지 않는다
(API+서버는 로드맵). 대신 `prompt.ts`가 조립까지는 코드로 하고, 사람이 그 결과를 복사해서
Claude에 붙여넣고 받은 JSON을 콘솔에 다시 붙여넣는다 — "API 한 줄만 연결하면 끝"이 되도록
조립·검증은 전부 코드가 하고, 남은 수동 작업은 "그 문자열을 API로 보내는 것" 하나뿐이게 설계함.

액션 enum이 바뀌면 `strategist.md`의 표도 같이 고쳐야 한다 — `app/executors/types.ts`의
`ActionType`/`isActionType`과 항상 일치시킬 것.
