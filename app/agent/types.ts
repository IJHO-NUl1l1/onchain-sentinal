// 🟢 두뇌 로직 공용 타입. architecture.md §2 [Agent] "구조화 출력
// { severity, diagnosis, action(enum), rationale }" 을 diagnose+strategize
// 두 단계로 나눠 표현한다. action(enum)은 executors/types.ts의 ActionType 재사용.

import type { Action } from "../executors/types";

// 1차 초안. 프롬프트 실제 작성하면서 조정 가능 — 확정 스펙이 아님.
export type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: readonly Severity[] = ["low", "medium", "high", "critical"];

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export interface Diagnosis {
  severity: Severity;
  diagnosis: string;
}

export interface Strategy {
  action: Action;
  rationale: string;
}
