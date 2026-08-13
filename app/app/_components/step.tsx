"use client";

// run-console.tsx와 flare-console.tsx가 공유하는 UI 프리미티브. 두 콘솔이 서로 다른 executor를
// 보여주지만 "막(step) 하나 = 상태·값·원본 응답"이라는 시각 문법은 동일해야 한다.

import { useState } from "react";

export type Status = "idle" | "running" | "success" | "error" | "waiting";

export interface Row {
  label: string;
  value: string;
  /** 이 값이 무엇인지 한 줄 설명 */
  hint?: string;
  href?: string;
  strong?: boolean;
}

export const STATUS_STYLE: Record<Status, { chip: string; text: string; bar: string }> = {
  idle: { chip: "border-zinc-700 text-zinc-500", text: "IDLE", bar: "bg-zinc-800" },
  running: { chip: "border-amber-500/40 text-amber-500", text: "RUNNING", bar: "bg-amber-500" },
  success: { chip: "border-emerald-500/40 text-emerald-500", text: "SUCCESS", bar: "bg-emerald-500" },
  error: { chip: "border-red-500/40 text-red-500", text: "FAILED", bar: "bg-red-500" },
  waiting: { chip: "border-sky-500/40 text-sky-400", text: "AWAITING AGENT", bar: "bg-sky-500" },
};

/** 원본 응답 JSON — 기본 접힘, 클릭하면 슬라이드로 펼쳐진다. */
export function RawToggle({ value, label }: { value: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  if (value === undefined) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400"
      >
        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        {label}
      </button>
      <div className={`collapsible-grid ${open ? "is-open" : ""}`}>
        <div>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
            {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function Step({
  index,
  title,
  subtitle,
  status,
  durationMs,
  rows,
  raw,
  rawLabel,
  error,
  children,
}: {
  index: number;
  title: string;
  subtitle: string;
  status: Status;
  durationMs?: number;
  rows?: Row[];
  raw?: unknown;
  rawLabel?: string;
  error?: string;
  children?: React.ReactNode;
}) {
  const s = STATUS_STYLE[status];
  return (
    <section className="step-enter relative rounded-lg border border-zinc-800 bg-zinc-950/40 p-5">
      <span className={`absolute left-0 top-5 h-[calc(100%-2.5rem)] w-0.5 rounded-r ${s.bar}`} />
      <div className="flex items-start justify-between gap-4 pl-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs text-zinc-600">{String(index).padStart(2, "0")}</span>
            <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {durationMs !== undefined && (
            <span className="font-mono text-[11px] text-zinc-600">{durationMs} ms</span>
          )}
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${s.chip}`}>
            {s.text}
          </span>
        </div>
      </div>

      <div className="pl-3">
        {rows && rows.length > 0 && (
          <dl className="mt-4 grid gap-1.5">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-3 text-xs">
                <dt className="w-44 shrink-0 text-zinc-500">{r.label}</dt>
                <dd className="min-w-0">
                  <span
                    className={`block break-all font-mono ${
                      r.strong ? "text-emerald-400" : "text-zinc-300"
                    }`}
                  >
                    {r.href ? (
                      <a
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-zinc-700 underline-offset-2 hover:decoration-emerald-500"
                      >
                        {r.value} ↗
                      </a>
                    ) : (
                      r.value
                    )}
                  </span>
                  {r.hint && <span className="mt-0.5 block text-[11px] text-zinc-600">{r.hint}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {error && (
          <p className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-3 font-mono text-[11px] text-red-400">
            {error}
          </p>
        )}
        {children}
        <RawToggle value={raw} label={rawLabel ?? "Raw response"} />
      </div>
    </section>
  );
}
