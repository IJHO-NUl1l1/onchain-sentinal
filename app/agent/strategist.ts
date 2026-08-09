// 🟢 strategist: 진단 → 액션 enum 선택. architecture.md §2 [Agent].
// 안전장치: 출력은 사전정의 액션 enum으로 제한 (CLAUDE.md 핵심 원칙 —
// LLM은 판단만, 실행은 결정론적 executor가 함). 액션 enum은 executors/types.ts의
// ActionType으로 확정됨 (architecture.md §10).

import type { Diagnosis, Strategy } from "./types";

export async function decideStrategy(_diagnosis: Diagnosis): Promise<Strategy> {
  // 로드맵: API+서버 단계에서 prompts/strategist.md로 Claude API 호출.
  // 지금(Phase C 반자동 데모)은 사람이 그 프롬프트를 Claude Code 세션에 직접 넣는다.
  throw new Error("decideStrategy: not implemented (roadmap — see prompts/strategist.md)");
}
