"use client";

// 데모용 실행 콘솔. architecture.md §8-2의 5막을 화면 위에 순서대로 펼친다.
// 일반 제품 UI보다 훨씬 많은 날것의 정보(원본 응답, tx 해시, 가스, 링크)를 일부러 노출한다 —
// 영상에서 "중간 과정이 실제로 성공했다"가 눈으로 보여야 하기 때문.
// 각 단계는 실제로 순차 호출된다. 화면에 뜨는 순서 = 실행 순서(연출 아님).

import { useState } from "react";
import {
  stepAnalyze,
  stepExecute,
  stepProvision,
  stepVerify,
  type AaveSnapshot,
} from "../_actions/run-steps";
import type { ActionType, MonitoringProfile } from "../../executors/types";

// Base 메인넷 확정값 (architecture.md §8-2 — 온체인 조회로 확인)
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_WETH = "0x4200000000000000000000000000000000000006";
const POLICY_THRESHOLD = "2.5";

type Status = "idle" | "running" | "success" | "error" | "waiting";

interface Row {
  label: string;
  value: string;
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

function Raw({ value }: { value: unknown }) {
  if (value === undefined) return null;
  return (
    <pre className="mt-3 max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
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
  error?: string;
  children?: React.ReactNode;
}) {
  const s = STATUS_STYLE[status];
  return (
    <section className="relative rounded-lg border border-zinc-800 bg-zinc-950/40 p-5">
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
                <dd
                  className={`min-w-0 break-all font-mono ${
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
        <Raw value={raw} />
      </div>
    </section>
  );
}

function snapshotRows(s: AaveSnapshot): Row[] {
  return [
    { label: "Health factor", value: s.healthFactor, strong: true },
    { label: "Total collateral", value: `$${s.collateralUsd}` },
    { label: "Total debt", value: `$${s.debtUsd}` },
    { label: "LTV", value: `${s.ltvPercent}%` },
    { label: "Liquidation threshold", value: `${s.liquidationThresholdPercent}%` },
    { label: "healthFactor (uint256)", value: s.healthFactorRaw },
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

  const [verdictText, setVerdictText] = useState("");
  const [verdict, setVerdict] = useState<{
    severity?: string;
    diagnosis?: string;
    action?: ActionType;
    rationale?: string;
  } | null>(null);
  const [verdictErr, setVerdictErr] = useState<string | null>(null);

  const [asset, setAsset] = useState(BASE_WETH);
  const [amount, setAmount] = useState("");
  const [exec, setExec] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string; rows?: Row[] }>(
    { status: "idle" },
  );

  const [verify, setVerify] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string }>({
    status: "idle",
  });
  const [after, setAfter] = useState<AaveSnapshot | null>(null);

  async function run() {
    const target = address.trim();
    if (!target) return;

    setSnapshot(null);
    setProfile(null);
    setProvision({ status: "idle" });
    setVerdict(null);
    setVerdictText("");
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

    setProvision({ status: "running" });
    const p = await stepProvision(a.data.profile);
    if (!p.ok || !p.data) {
      setProvision({ status: "error", ms: p.durationMs, err: p.error });
      return;
    }
    setProvision({
      status: "success",
      ms: p.durationMs,
      raw: p.data.raw,
      rows: [
        { label: "Workflow", value: p.data.label ?? "-", strong: true },
        { label: "Workflow id", value: p.data.reference ?? "-" },
        ...(p.data.link ? [{ label: "Open in KeeperHub", value: p.data.link, href: p.data.link }] : []),
      ],
    });
  }

  function applyVerdict() {
    setVerdictErr(null);
    try {
      const parsed = JSON.parse(verdictText);
      setVerdict(parsed);
    } catch (e) {
      setVerdictErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function runExecute() {
    if (!verdict?.action) return;
    setExec({ status: "running" });
    const r = await stepExecute(verdict.action, { asset, amount });
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
        { label: "Action", value: verdict.action, strong: true },
        { label: "Asset", value: asset },
        { label: "Amount (base units)", value: amount || "-" },
        ...(tx.transactionLink
          ? [{ label: "Transaction", value: tx.transactionLink, href: tx.transactionLink, strong: true }]
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

  const handoff = snapshot
    ? JSON.stringify(
        {
          wallet: address.trim(),
          chain: "base-mainnet (8453)",
          policyThreshold: POLICY_THRESHOLD,
          aave: snapshot,
        },
        null,
        2,
      )
    : "";

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
            className="flex-1 rounded-md border border-zinc-700 bg-transparent px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60"
          />
          <button
            onClick={run}
            disabled={analyze.status === "running" || provision.status === "running"}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:opacity-40"
          >
            Run
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Reads live Aave v3 state on Base, then designs and deploys a watch through KeeperHub.
        </p>
      </section>

      <Step
        index={1}
        title="Read onchain state"
        subtitle="Aave v3 Pool · Base mainnet · getUserAccountData"
        status={analyze.status}
        durationMs={analyze.ms}
        rows={snapshot ? snapshotRows(snapshot) : undefined}
        raw={analyze.raw}
        error={analyze.err}
      />

      <Step
        index={2}
        title="Deploy the watch"
        subtitle="KeeperHub MCP · create_workflow · designed from the state above"
        status={provision.status}
        durationMs={provision.ms}
        rows={provision.rows}
        raw={provision.raw}
        error={provision.err}
      />

      <Step
        index={3}
        title="Agent diagnosis"
        subtitle="Real data in, one action out — constrained to the predefined enum"
        status={verdict ? "success" : snapshot ? "waiting" : "idle"}
        rows={
          verdict
            ? [
                { label: "Severity", value: String(verdict.severity ?? "-"), strong: true },
                { label: "Diagnosis", value: String(verdict.diagnosis ?? "-") },
                { label: "Action", value: String(verdict.action ?? "-"), strong: true },
                { label: "Rationale", value: String(verdict.rationale ?? "-") },
              ]
            : undefined
        }
      >
        {snapshot && !verdict && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500">
              Payload handed to the agent. Paste its JSON verdict back below.
            </p>
            <Raw value={handoff} />
            <textarea
              value={verdictText}
              onChange={(e) => setVerdictText(e.target.value)}
              rows={4}
              placeholder={'{"severity":"high","diagnosis":"...","action":"REPAY_DEBT","rationale":"..."}'}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-sky-500/50"
            />
            {verdictErr && <p className="mt-1 font-mono text-[11px] text-red-400">{verdictErr}</p>}
            <button
              onClick={applyVerdict}
              className="mt-2 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Load verdict
            </button>
          </div>
        )}
      </Step>

      <Step
        index={4}
        title="Execute onchain"
        subtitle="KeeperHub signs with Turnkey — no human key, no wallet popup"
        status={exec.status}
        durationMs={exec.ms}
        rows={exec.rows}
        raw={exec.raw}
        error={exec.err}
      >
        {verdict?.action && exec.status !== "success" && (
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
                placeholder="100000"
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

      <Step
        index={5}
        title="Verify onchain"
        subtitle="Re-read the position — the defense has to move real state"
        status={verify.status}
        durationMs={verify.ms}
        rows={
          after && snapshot
            ? [
                { label: "Health factor before", value: snapshot.healthFactor },
                { label: "Health factor after", value: after.healthFactor, strong: true },
                { label: "Debt before", value: `$${snapshot.debtUsd}` },
                { label: "Debt after", value: `$${after.debtUsd}` },
              ]
            : undefined
        }
        raw={verify.raw}
        error={verify.err}
      >
        {snapshot && verify.status !== "running" && (
          <button
            onClick={runVerify}
            className="mt-4 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Re-read position
          </button>
        )}
      </Step>
    </div>
  );
}
