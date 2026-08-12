"use client";

// 데모용 실행 콘솔. architecture.md §8-2의 5막을 한 막씩 펼친다 — 다음 막은 이전 막이
// 끝나야 나타나고 각자 자기 버튼으로 넘어간다(자동 연쇄 없음).
// 원본 응답·tx 해시 같은 날것의 정보를 그대로 노출하되 기본은 접어둔다.

import { useEffect, useState } from "react";
import {
  stepAnalyze,
  stepBuildPrompt,
  stepDiagnose,
  stepExecute,
  stepParseVerdict,
  stepProvision,
  stepVerify,
  type AaveSnapshot,
} from "../_actions/run-steps";
import type { ActionType, MonitoringProfile } from "../../executors/types";
import type { Verdict } from "../../agent/prompt";

// Base 메인넷 확정값 (architecture.md §8-2 — 온체인 조회로 확인)
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_WETH = "0x4200000000000000000000000000000000000006";

type Status = "idle" | "running" | "success" | "error" | "waiting";

interface Row {
  label: string;
  value: string;
  /** 이 값이 무엇인지 한 줄 설명 */
  hint?: string;
  href?: string;
  strong?: boolean;
}

const STATUS_STYLE: Record<Status, { chip: string; text: string; bar: string }> = {
  idle: { chip: "border-zinc-700 text-zinc-500", text: "IDLE", bar: "bg-zinc-800" },
  running: { chip: "border-amber-500/40 text-amber-500", text: "RUNNING", bar: "bg-amber-500" },
  success: { chip: "border-emerald-500/40 text-emerald-500", text: "SUCCESS", bar: "bg-emerald-500" },
  error: { chip: "border-red-500/40 text-red-500", text: "FAILED", bar: "bg-red-500" },
  waiting: { chip: "border-sky-500/40 text-sky-400", text: "AWAITING AGENT", bar: "bg-sky-500" },
};

/** 원본 응답 JSON — 기본 접힘, 클릭하면 슬라이드로 펼쳐진다. */
function RawToggle({ value, label }: { value: unknown; label: string }) {
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

function Step({
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

function snapshotRows(s: AaveSnapshot): Row[] {
  return [
    {
      label: "Health factor",
      value: s.healthFactor,
      strong: true,
      hint: "How close this position is to liquidation. 1.0 is the point of no return.",
    },
    {
      label: "Total collateral",
      value: `$${s.collateralUsd}`,
      hint: "What the wallet has deposited, priced by Aave's own oracle.",
    },
    { label: "Total debt", value: `$${s.debtUsd}`, hint: "What it has borrowed against that collateral." },
    { label: "Max LTV", value: `${s.ltvPercent}%`, hint: "The most it is allowed to borrow." },
    {
      label: "Liquidation threshold",
      value: `${s.liquidationThresholdPercent}%`,
      hint: "Past this ratio the collateral gets seized.",
    },
    {
      label: "healthFactor (uint256)",
      value: s.healthFactorRaw,
      hint: "The unmodified return value from the contract, 18 decimals. Maximum means no debt.",
    },
  ];
}

export function RunConsole() {
  const [address, setAddress] = useState("");

  const [analyze, setAnalyze] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string }>({
    status: "idle",
  });
  const [snapshot, setSnapshot] = useState<AaveSnapshot | null>(null);
  const [profile, setProfile] = useState<MonitoringProfile | null>(null);

  const [provision, setProvision] = useState<{
    status: Status;
    raw?: unknown;
    ms?: number;
    err?: string;
    rows?: Row[];
  }>({ status: "idle" });

  const [agentPrompt, setAgentPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verdictText, setVerdictText] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictErr, setVerdictErr] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  /** 모델이 돌려준 원문. 판정이 지어낸 값이 아니라는 증거로 그대로 띄운다 */
  const [verdictRaw, setVerdictRaw] = useState<unknown>(null);
  const [verdictMs, setVerdictMs] = useState<number | undefined>(undefined);

  const [asset, setAsset] = useState(BASE_WETH);
  const [amount, setAmount] = useState("");
  const [exec, setExec] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string; rows?: Row[] }>(
    { status: "idle" },
  );

  const [verify, setVerify] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string }>({
    status: "idle",
  });
  const [after, setAfter] = useState<AaveSnapshot | null>(null);

  // 2막이 끝나면 3막 프롬프트를 미리 조립해 화면에 띄워둔다.
  useEffect(() => {
    if (provision.status !== "success" || !profile || !snapshot) return;
    let cancelled = false;
    stepBuildPrompt(profile, snapshot).then((p) => {
      if (!cancelled) setAgentPrompt(p);
    });
    return () => {
      cancelled = true;
    };
  }, [provision.status, profile, snapshot]);

  async function runAnalyze() {
    const target = address.trim();
    if (!target) return;

    // 다시 돌리는 경우라 뒤 단계를 전부 리셋한다
    setSnapshot(null);
    setProfile(null);
    setProvision({ status: "idle" });
    setAgentPrompt(null);
    setVerdict(null);
    setVerdictText("");
    setVerdictErr(null);
    setVerdictRaw(null);
    setVerdictMs(undefined);
    setExec({ status: "idle" });
    setVerify({ status: "idle" });
    setAfter(null);

    setAnalyze({ status: "running" });
    const a = await stepAnalyze(target);
    if (!a.ok || !a.data) {
      setAnalyze({ status: "error", ms: a.durationMs, err: a.error });
      return;
    }
    setSnapshot(a.data.snapshot);
    setProfile(a.data.profile);
    setAnalyze({ status: "success", ms: a.durationMs, raw: a.data.snapshot });
  }

  async function runProvision() {
    if (!profile) return;
    setProvision({ status: "running" });
    const p = await stepProvision(profile);
    if (!p.ok || !p.data) {
      setProvision({ status: "error", ms: p.durationMs, err: p.error });
      return;
    }
    setProvision({
      status: "success",
      ms: p.durationMs,
      raw: p.data.raw,
      rows: [
        {
          label: "Workflow",
          value: p.data.label ?? "-",
          strong: true,
          hint: "Named after the wallet — the agent generated it just now, it is not a template someone filled in.",
        },
        {
          label: "Workflow id",
          value: p.data.reference ?? "-",
          hint: "KeeperHub's identifier for the watch that now exists on their side.",
        },
        ...(p.data.link
          ? [
              {
                label: "Open in KeeperHub",
                value: p.data.link,
                href: p.data.link,
                hint: "The same workflow, seen from KeeperHub's own dashboard.",
              },
            ]
          : []),
      ],
    });
  }

  async function copyPrompt() {
    if (!agentPrompt) return;
    await navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // KeeperHubExecutor.execute()가 트랜잭션 없이 단락시키는 액션들. 여기 목록이 executor와
  // 어긋나면 화면과 실제 동작이 갈리므로, 바꿀 땐 executors/keeperhub.ts와 같이 고쳐야 한다.
  const needsNoTransaction = verdict?.action === "NO_ACTION" || verdict?.action === "INCREASE_MONITORING";

  // 3막 기본 경로 — 조립·호출·검증이 서버에서 한 번에 돈다.
  async function runDiagnose() {
    if (!profile || !snapshot) return;
    setVerdictErr(null);
    setVerdictLoading(true);
    const r = await stepDiagnose(profile, snapshot);
    setVerdictLoading(false);
    if (!r.ok || !r.data) {
      setVerdictErr(r.error ?? "diagnosis failed");
      return;
    }
    setVerdictMs(r.durationMs);
    setVerdictRaw(r.data.raw);
    setVerdict(r.data.verdict);
  }

  // 폴백 — API 키 없이 손으로 옮겨 붙이는 경로.
  async function applyVerdict() {
    setVerdictErr(null);
    setVerdictLoading(true);
    const result = await stepParseVerdict(verdictText);
    setVerdictLoading(false);
    if (!result.ok) {
      setVerdictErr(result.error);
      return;
    }
    setVerdict(result.verdict);
  }

  async function runExecute() {
    if (!verdict?.action) return;
    setExec({ status: "running" });
    const r = await stepExecute(verdict.action as ActionType, { asset, amount });
    if (!r.ok || !r.data) {
      setExec({ status: "error", ms: r.durationMs, err: r.error });
      return;
    }
    const tx = r.data;
    setExec({
      status: tx.success ? "success" : "error",
      ms: r.durationMs,
      raw: tx.raw,
      err: tx.success ? undefined : "KeeperHub reported the action as unsuccessful",
      rows: [
        {
          label: "Action",
          value: verdict.action,
          strong: true,
          hint: "The action the agent picked in step 3, executed verbatim.",
        },
        { label: "Asset", value: asset, hint: "The ERC-20 the action moves." },
        {
          label: "Amount (base units)",
          value: amount || "-",
          hint: "Aave actions take integer base units, not decimals — USDC has 6, WETH has 18.",
        },
        ...(tx.transactionLink
          ? [
              {
                label: "Transaction",
                value: tx.transactionLink,
                href: tx.transactionLink,
                strong: true,
                hint: "Verify here. If gas was sponsored the sender is a relayer and the real call sits under Internal Transactions.",
              },
            ]
          : []),
      ],
    });
  }

  async function runVerify() {
    const target = address.trim();
    setVerify({ status: "running" });
    const v = await stepVerify(target);
    if (!v.ok || !v.data) {
      setVerify({ status: "error", ms: v.durationMs, err: v.error });
      return;
    }
    setAfter(v.data);
    setVerify({ status: "success", ms: v.durationMs, raw: v.data });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-5">
        <label className="text-xs text-zinc-500">Wallet to guard</label>
        <div className="mt-2 flex gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            disabled={analyze.status === "running"}
            className="flex-1 rounded-md border border-zinc-700 bg-transparent px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60 disabled:opacity-50"
          />
          <button
            onClick={runAnalyze}
            disabled={analyze.status === "running"}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:opacity-40"
          >
            Check wallet
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Step 1 only — reads live Aave v3 state on Base. Each following step runs on its own, one at a
          time.
        </p>
      </section>

      <Step
        index={1}
        title="Read the position onchain"
        subtitle="Calls getUserAccountData on the Aave v3 Pool, Base mainnet. Nothing here is simulated or seeded."
        status={analyze.status}
        durationMs={analyze.ms}
        rows={snapshot ? snapshotRows(snapshot) : undefined}
        raw={analyze.raw}
        rawLabel="Raw values returned by Aave v3 Pool"
        error={analyze.err}
      />

      {snapshot && (
        <Step
          index={2}
          title="Design and deploy the watch"
          subtitle="Sends create_workflow over KeeperHub's MCP: an hourly job that re-reads this wallet's health factor."
          status={provision.status}
          durationMs={provision.ms}
          rows={provision.rows}
          raw={provision.raw}
          rawLabel="Raw workflow KeeperHub created"
          error={provision.err}
        >
          {provision.status === "idle" && (
            <button
              onClick={runProvision}
              className="mt-4 rounded-md bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-300"
            >
              Deploy watch
            </button>
          )}
        </Step>
      )}

      {provision.status === "success" && (
        <Step
          index={3}
          title="Agent reads it and decides"
          subtitle="Claude reads the live position and answers with one of seven predefined actions — it cannot invent a new one. Assembled, called and validated in code."
          status={verdict ? "success" : "waiting"}
          durationMs={verdictMs}
          raw={verdictRaw ?? undefined}
          rawLabel="Raw response from the model"
          rows={
            verdict
              ? [
                  {
                    label: "Severity",
                    value: verdict.severity,
                    strong: true,
                    hint: "How urgent the agent judged this position to be.",
                  },
                  {
                    label: "Diagnosis",
                    value: verdict.diagnosis,
                    hint: "Its reading of the state, in its own words.",
                  },
                  {
                    label: "Action",
                    value: verdict.action,
                    strong: true,
                    hint: "Validated against the fixed enum before being accepted. This is what step 4 will execute.",
                  },
                  { label: "Rationale", value: verdict.rationale, hint: "Why it chose that." },
                ]
              : undefined
          }
        >
          {!verdict && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500">
                The prompt below was assembled by code from the live on-chain data above — no hand
                editing. Pressing Diagnose sends it to Claude and validates the reply against the
                action enum before anything can reach the chain (
                <code className="text-zinc-400">agent/prompt.ts</code>,{" "}
                <code className="text-zinc-400">agent/claude.ts</code>). A verdict naming an action
                outside the enum is rejected here and never executes.
              </p>

              <button
                onClick={runDiagnose}
                disabled={verdictLoading || !agentPrompt}
                className="mt-3 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:border-sky-400 disabled:opacity-40"
              >
                {verdictLoading ? "Diagnosing…" : "Diagnose with Claude"}
              </button>
              {verdictErr && (
                <p className="mt-2 font-mono text-[11px] text-red-400">Rejected — {verdictErr}</p>
              )}

              <div className="mt-3 rounded border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    Prompt sent to the agent
                  </span>
                  <button
                    type="button"
                    onClick={copyPrompt}
                    disabled={!agentPrompt}
                    className="rounded border border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
                  {agentPrompt ?? "Assembling…"}
                </pre>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400">
                  No API key? Relay the verdict manually
                </summary>
                <textarea
                  value={verdictText}
                  onChange={(e) => setVerdictText(e.target.value)}
                  rows={4}
                  placeholder={'{"severity":"high","diagnosis":"...","action":"REPAY_DEBT","rationale":"..."}'}
                  className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-sky-500/50"
                />
                <button
                  onClick={applyVerdict}
                  disabled={verdictLoading || !verdictText.trim()}
                  className="mt-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
                >
                  {verdictLoading ? "Validating…" : "Load verdict"}
                </button>
              </details>
            </div>
          )}
        </Step>
      )}

      {verdict?.action && (
        <Step
          index={4}
          title={needsNoTransaction ? "Nothing to execute" : "Execute it onchain"}
          subtitle={
            needsNoTransaction
              ? "The agent judged this position safe, so no transaction is sent. A guardian that acts anyway is a guardian that costs you money."
              : "KeeperHub submits the transaction and Turnkey signs it inside a secure enclave. No human key, no wallet popup."
          }
          status={needsNoTransaction ? "success" : exec.status}
          durationMs={needsNoTransaction ? undefined : exec.ms}
          rows={
            needsNoTransaction
              ? [
                  {
                    label: "Verdict",
                    value: verdict.action,
                    strong: true,
                    hint: "This action is resolved off-chain — it maps to no KeeperHub call.",
                  },
                  {
                    label: "Transactions sent",
                    value: "0",
                    hint: "Deciding not to act is a real outcome, not a failure to run.",
                  },
                ]
              : exec.rows
          }
          raw={needsNoTransaction ? undefined : exec.raw}
          rawLabel="Raw response from KeeperHub"
          error={needsNoTransaction ? undefined : exec.err}
        >
          {!needsNoTransaction && exec.status !== "success" && (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div>
                <label className="text-[11px] text-zinc-500">Asset</label>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="mt-1 block rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-300"
                >
                  <option value={BASE_WETH}>WETH · 18 decimals</option>
                  <option value={BASE_USDC}>USDC · 6 decimals</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-zinc-500">Amount (base units — not decimals)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={asset === BASE_USDC ? "100000  (= 0.1 USDC)" : "10000000000000000  (= 0.01 WETH)"}
                  className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-300 outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                onClick={runExecute}
                disabled={exec.status === "running"}
                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Execute {verdict.action}
              </button>
            </div>
          )}
        </Step>
      )}

      {exec.status === "success" && (
        <Step
          index={5}
          title="Confirm the state actually moved"
          subtitle="Reads the same contract again. A defense that does not change the numbers did not happen."
          status={verify.status}
          durationMs={verify.ms}
          rows={
            after && snapshot
              ? [
                  {
                    label: "Health factor before",
                    value: snapshot.healthFactor,
                    hint: "Measured in step 1, before the agent acted.",
                  },
                  {
                    label: "Health factor after",
                    value: after.healthFactor,
                    strong: true,
                    hint: "Same call, same contract, after the transaction landed.",
                  },
                  { label: "Debt before", value: `$${snapshot.debtUsd}` },
                  { label: "Debt after", value: `$${after.debtUsd}`, hint: "Lower means the repayment settled." },
                ]
              : undefined
          }
          raw={verify.raw}
          rawLabel="Raw values returned by Aave v3 Pool (after)"
          error={verify.err}
        >
          {verify.status !== "running" && verify.status !== "success" && (
            <button
              onClick={runVerify}
              className="mt-4 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Re-read position
            </button>
          )}
        </Step>
      )}
    </div>
  );
}
