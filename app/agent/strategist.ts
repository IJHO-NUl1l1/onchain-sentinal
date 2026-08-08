// 🟢 strategist: 진단 → 액션 enum 선택. architecture.md §2 [Agent].
// 안전장치: 출력은 사전정의 액션 enum으로 제한 (CLAUDE.md 핵심 원칙 —
// LLM은 판단만, 실행은 결정론적 executor가 함). 액션 enum 자체는 미확정
// (docs/todo.md "결정 대기": search_protocol_actions 결과 + AssetVault 패턴).

import type { Diagnosis, Strategy } from "./types";

export async function decideStrategy(_diagnosis: Diagnosis): Promise<Strategy> {
  // TODO(Phase B): prompts/strategist.md 작성 + 액션 enum 확정 후 구현.
  throw new Error("decideStrategy: not implemented");
}
