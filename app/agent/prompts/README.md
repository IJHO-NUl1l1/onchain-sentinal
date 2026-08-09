# prompts/

`diagnoser.md` / `strategist.md` — Phase 2 반자동 데모에서 사람이 Claude Code
세션에 붙여넣는 프롬프트. 지금은 `diagnoser.ts`/`strategist.ts`가 이 프롬프트를
코드로 자동 호출하지 않는다 (API+서버는 로드맵 — docs/todo.md "8/9 스코프 조정" 참조).

액션 enum이 바뀌면 `strategist.md`의 표도 같이 고쳐야 한다 — `app/executors/types.ts`의
`ActionType`과 항상 일치시킬 것.
