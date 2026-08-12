// 🟢 diagnoser: 사건 → 진단. 입출력 계약만 고정한 스텁이다.
// ⚠️ 실제 경로는 agent/claude.ts가 담당한다(진단+전략을 한 호출로 처리) — 이 함수는 미사용.

import type { Diagnosis } from "./types";

export async function diagnose(_event: unknown): Promise<Diagnosis> {
  throw new Error("diagnose: superseded by askAgent() in agent/claude.ts");
}
