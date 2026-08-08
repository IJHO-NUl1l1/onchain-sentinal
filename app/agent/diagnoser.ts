// 🟢 diagnoser: 사건 → 진단. architecture.md §2 [Agent].
// Phase 2 Escalation에서 사람이 투입한 사건(가격 급락 등)을 받아
// severity/diagnosis를 산출한다. 실제 판단은 Claude(프롬프트)가 하고,
// 여기는 입출력 계약만 고정한다.

import type { Diagnosis } from "./types";

export async function diagnose(_event: unknown): Promise<Diagnosis> {
  // TODO(Phase B): prompts/diagnoser.md 작성 후 Claude 호출로 교체.
  throw new Error("diagnose: not implemented");
}
