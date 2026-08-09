import type { Severity } from "../../agent/types";

interface LogEntry {
  timestamp: string;
  severity: Severity;
  diagnosis: string;
  action: string;
  rationale: string;
}

// UI 골격 단계 — Agent 로직(diagnoser/strategist) 붙으면 실제 판단 로그로 교체.
const PLACEHOLDER_LOGS: LogEntry[] = [
  {
    timestamp: "2026-08-08 14:32",
    severity: "medium",
    diagnosis: "담보 자산 가격 8% 하락 감지",
    action: "감시 강화",
    rationale: "청산 임계값까지 여유 있으나 변동성 추세 확인 필요",
  },
  {
    timestamp: "2026-08-08 09:10",
    severity: "low",
    diagnosis: "정기 헬스 팩터 점검",
    action: "조치 없음",
    rationale: "헬스 팩터 안전 범위 유지",
  },
];

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "낮음",
  medium: "중간",
  high: "높음",
  critical: "긴급",
};

const SEVERITY_STYLE: Record<Severity, string> = {
  low: "text-zinc-500 dark:text-zinc-400",
  medium: "text-amber-600 dark:text-amber-500",
  high: "text-orange-600 dark:text-orange-500",
  critical: "text-red-600 dark:text-red-500",
};

export function LogTable() {
  return (
    <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
        판단 로그
      </h2>

      {PLACEHOLDER_LOGS.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          아직 기록이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {PLACEHOLDER_LOGS.map((log) => (
            <li key={log.timestamp} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-zinc-900 dark:text-zinc-100">
                  {log.diagnosis}
                </span>
                <span
                  className={`text-xs font-medium shrink-0 ${SEVERITY_STYLE[log.severity]}`}
                >
                  {SEVERITY_LABEL[log.severity]}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {log.action} — {log.rationale}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600 font-mono">
                {log.timestamp}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
