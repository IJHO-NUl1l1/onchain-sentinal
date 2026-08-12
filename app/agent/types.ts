// 🟢 두뇌 로직 공용 타입. 판정의 형태는 agent/prompt.ts의 Verdict가 정의한다.

export type Severity = "low" | "medium" | "high" | "critical";

export const SEVERITIES: readonly Severity[] = ["low", "medium", "high", "critical"];

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}
