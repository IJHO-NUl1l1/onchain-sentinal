// 🟢 strategist: 진단 → 액션 enum 선택. 입출력 계약만 고정한 스텁이다.
// ⚠️ 실제 경로는 agent/claude.ts가 담당한다 — 이 함수는 미사용.

import type { Diagnosis, Strategy } from "./types";

export async function decideStrategy(_diagnosis: Diagnosis): Promise<Strategy> {
  throw new Error("decideStrategy: superseded by askAgent() in agent/claude.ts");
}
