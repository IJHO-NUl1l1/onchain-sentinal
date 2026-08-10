import type { Severity } from "../../agent/types";

interface LogEntry {
  timestamp: string;
  severity: Severity;
  diagnosis: string;
  action: string;
  rationale: string;
}

// ⚠️ UI 골격 단계 — 아직 실제 판단 로그가 아니라 **샘플 데이터**다.
// diagnoser/strategist 결과를 저장·조회하는 배선이 붙으면 교체한다.
// 데모 영상에서 이걸 실제 로그처럼 비추지 말 것 (architecture.md §8-1 정직성 체크).
const PLACEHOLDER_LOGS: LogEntry[] = [
  {
    timestamp: "2026-08-08 14:32",
    severity: "medium",
    diagnosis: "Collateral price dropped 8%",
    action: "Increase monitoring",
    rationale: "Still clear of the liquidation threshold, but the volatility trend needs watching",
  },
  {
    timestamp: "2026-08-08 09:10",
    severity: "low",
    diagnosis: "Scheduled health factor check",
    action: "No action",
    rationale: "Health factor remains within the safe range",
  },
];

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// 텍스트를 색칠하는 대신 왼쪽 바 하나로만 심각도를 표시 — 한 번에 여러 색이
// 눈에 들어오지 않게.
const SEVERITY_BAR: Record<Severity, string> = {
  low: "bg-zinc-300 dark:bg-zinc-700",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function LogTable() {
  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
        Decision log
      </h2>

      {PLACEHOLDER_LOGS.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No entries yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {PLACEHOLDER_LOGS.map((log) => (
            <li key={log.timestamp} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className={`w-1 shrink-0 rounded-sm ${SEVERITY_BAR[log.severity]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">
                    {log.diagnosis}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
                    {SEVERITY_LABEL[log.severity]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {log.action} — {log.rationale}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  {log.timestamp}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
