// 🟢 두뇌 로직 공용 타입. action(enum)은 executors/types.ts의 ActionType을 재사용한다.

import type { Action } from "../executors/types";

export type Severity = "low" | "medium" | "high" | "critical";

export const SEVERITIES: readonly Severity[] = ["low", "medium", "high", "critical"];

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
