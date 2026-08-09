// 🟢 diagnoser: 사건 → 진단. architecture.md §2 [Agent].
// Phase 2 Escalation에서 사람이 투입한 사건(가격 급락 등)을 받아
// severity/diagnosis를 산출한다. 실제 판단은 Claude(프롬프트)가 하고,
// 여기는 입출력 계약만 고정한다.

import type { Diagnosis } from "./types";

export async function diagnose(_event: unknown): Promise<Diagnosis> {
  // 로드맵: API+서버 단계에서 prompts/diagnoser.md로 Claude API 호출.
  // 지금(Phase C 반자동 데모)은 사람이 그 프롬프트를 Claude Code 세션에 직접 넣는다.
  throw new Error("diagnose: not implemented (roadmap — see prompts/diagnoser.md)");
}
