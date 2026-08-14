"use client";

// Flare 데모 콘솔. run-console.tsx와 대칭 구조(5막, 막마다 버튼)지만 데이터가 Aave 포지션이
// 아니라 FTSO 가격이고, 판단 자체가 SentinelVault 컨트랙트 안에서 3단으로 미리 갈라진다 —
// 정상/즉시방어는 컨트랙트가 스스로 끝내고, 회색지대(에스컬레이션)만 Claude에게 넘어간다.

import { useEffect, useRef, useState } from "react";
import {
  flareStepCheck,
  flareStepDeploy,
  flareStepDiagnose,
  flareStepExecute,
  flareStepPeek,
  flareStepVerify,
} from "../_actions/flare-steps";
import type { ActionType } from "../../executors/types";
import type { Verdict } from "../../agent/prompt";
import { Step, type Row, type Status } from "./step";

// setPolicy에 onBehalfOf가 없어서 정책은 항상 서버 키(msg.sender)에 귀속된다 — KeeperHub 콘솔과
// 달리 지갑 주소를 사용자가 입력할 수 없다. architecture.md §8-3 8/13 실증 참조.
const POLICY_OWNER = "0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c";
const VAULT_ADDRESS = "0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF";
const EXPLORER = "https://coston2-explorer.flare.network";
const PEEK_INTERVAL_MS = 3000;

interface Peek {
  currentPrice: string;
  anchorPrice: string;
  thresholdBips: string;
  dropped: boolean;
  deviationBips: string;
  readyToCommit: boolean;
}

function fmtPrice(raw: string) {
  return (Number(raw) / 1e6).toFixed(6);
}

export function FlareConsole() {
  const [threshold, setThreshold] = useState("5");
  const [deploy, setDeploy] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string; rows?: Row[] }>({
    status: "idle",
  });

  const [watching, setWatching] = useState(false);
  const [peek, setPeek] = useState<Peek | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [check, setCheck] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string; rows?: Row[] }>({
    status: "idle",
  });
  const [tier, setTier] = useState<"normal" | "immediate-defense" | "escalation" | null>(null);
  const [escalationData, setEscalationData] = useState<{
    policy: { feedId: string; thresholdBips: string; anchorPrice: string };
    currentPrice: string;
    deviationBips: string;
  } | null>(null);

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictRaw, setVerdictRaw] = useState<unknown>(null);
  /** 실제로 모델에 보낸 문자열. 코드가 실데이터로 조립했다는 증거로 화면에 그대로 띄운다 */
  const [agentPrompt, setAgentPrompt] = useState<string | null>(null);
  const [verdictMs, setVerdictMs] = useState<number | undefined>(undefined);
  const [verdictErr, setVerdictErr] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const [exec, setExec] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string; rows?: Row[] }>({
    status: "idle",
  });

  const [verify, setVerify] = useState<{ status: Status; raw?: unknown; ms?: number; err?: string }>({
    status: "idle",
  });
  const [lockedAfter, setLockedAfter] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function runDeploy() {
    setDeploy({ status: "running" });
    // 다시 배치하는 경우라 뒤 단계를 전부 리셋
    setWatching(false);
    if (pollRef.current) clearInterval(pollRef.current);
    setPeek(null);
    setCheck({ status: "idle" });
    setTier(null);
    setEscalationData(null);
    setVerdict(null);
    setVerdictRaw(null);
    setAgentPrompt(null);
    setVerdictErr(null);
    setExec({ status: "idle" });
    setVerify({ status: "idle" });
    setLockedAfter(null);

    const r = await flareStepDeploy(threshold);
    if (!r.ok || !r.data) {
      setDeploy({ status: "error", ms: r.durationMs, err: r.error });
      return;
    }
    setDeploy({
      status: "success",
      ms: r.durationMs,
      raw: r.data,
      rows: [
        {
          label: "Feed",
          value: "XRP/USD",
          strong: true,
          hint: "Real FTSOv2 feed — the asset Flare's FAssets bridges onto the chain.",
        },
        {
          label: "Anchor price",
          value: fmtPrice(r.data.anchorPrice),
          hint: "The live price at the moment this policy was set — everything below is measured against this.",
        },
        { label: "Threshold", value: `${threshold} bips`, hint: "Gray-zone starts here; 2x this locks automatically." },
        {
          label: "Transaction",
          value: r.data.transactionLink,
          href: r.data.transactionLink,
          strong: true,
          hint: "setPolicy on SentinelVault.sol, Coston2 — real tx.",
        },
      ],
    });
  }

  function startWatching() {
    setWatching(true);
    const poll = async () => {
      const r = await flareStepPeek(POLICY_OWNER);
      if (r.ok && r.data) setPeek(r.data);
    };
    poll();
    pollRef.current = setInterval(poll, PEEK_INTERVAL_MS);
  }

  function stopWatching() {
    setWatching(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  /**
   * tier=normal은 "아직 때가 아니다"이지 실패가 아니다. 정책(anchor)은 그대로 두고 2막만 되돌려
   * 관찰을 재개한다 — 이게 없으면 타이밍을 한 번 놓칠 때마다 새로고침 후 처음부터 다시 해야 한다.
   */
  function resumeWatching() {
    setCheck({ status: "idle" });
    setTier(null);
    startWatching();
  }

  async function runCheck() {
    stopWatching();
    setCheck({ status: "running" });
    const r = await flareStepCheck(POLICY_OWNER);
    if (!r.ok || !r.data) {
      setCheck({ status: "error", ms: r.durationMs, err: r.error });
      return;
    }
    const result = r.data;
    setTier(result.tier);
    if (result.tier === "escalation" || result.tier === "immediate-defense") {
      setEscalationData({ policy: result.policy, currentPrice: result.currentPrice, deviationBips: result.deviationBips });
    }
    setCheck({
      status: "success",
      ms: r.durationMs,
      raw: result,
      rows: [
        {
          label: "Tier",
          value: result.tier,
          strong: true,
          hint:
            result.tier === "normal"
              ? "Price hasn't dropped past the threshold — the contract does nothing."
              : result.tier === "immediate-defense"
                ? "Drop passed 2x threshold — the contract locked the position itself. No LLM involved."
                : "Drop is between the threshold and 2x threshold — this is the gray zone the agent gets consulted for.",
        },
        ...(result.tier !== "normal"
          ? [
              { label: "Current price", value: fmtPrice(result.currentPrice), strong: true },
              { label: "Deviation", value: `${result.deviationBips} bips` },
              {
                label: "Transaction",
                value: result.transactionLink,
                href: result.transactionLink,
                strong: true,
                hint: "checkAndExecute on SentinelVault.sol — real tx, permissionless, anyone can call it.",
              },
            ]
          : []),
      ],
    });
  }

  async function runDiagnose() {
    if (!escalationData) return;
    setVerdictErr(null);
    setVerdictLoading(true);
    const r = await flareStepDiagnose(escalationData.policy, escalationData.currentPrice, escalationData.deviationBips);
    setVerdictLoading(false);
    if (!r.ok || !r.data) {
      setVerdictErr(r.error ?? "diagnosis failed");
      return;
    }
    setVerdictMs(r.durationMs);
    setVerdictRaw(r.data.raw);
    setAgentPrompt(r.data.prompt);
    setVerdict(r.data.verdict);
  }

  const needsNoTransaction = verdict?.action === "NO_ACTION" || verdict?.action === "INCREASE_MONITORING";

  async function runExecute() {
    if (!verdict?.action) return;
    setExec({ status: "running" });
    const r = await flareStepExecute(verdict.action as ActionType, POLICY_OWNER);
    if (!r.ok || !r.data) {
      setExec({ status: "error", ms: r.durationMs, err: r.error });
      return;
    }
    const tx = r.data;
    setExec({
      status: tx.success ? "success" : "error",
      ms: r.durationMs,
      raw: tx.raw,
      err: tx.success ? undefined : "agentRespond reported unsuccessful",
      rows: [
        { label: "Action", value: verdict.action, strong: true, hint: "The action the agent picked in step 3, executed verbatim." },
        ...(tx.transactionLink
          ? [
              {
                label: "Transaction",
                value: tx.transactionLink,
                href: tx.transactionLink,
                strong: true,
                hint: "agentRespond on SentinelVault.sol — only LOCK_POSITION actually changes state today.",
              },
            ]
          : []),
      ],
    });
  }

  async function runVerify() {
    setVerify({ status: "running" });
    const r = await flareStepVerify(POLICY_OWNER);
    if (!r.ok || !r.data) {
      setVerify({ status: "error", ms: r.durationMs, err: r.error });
      return;
    }
    setLockedAfter(r.data.isLocked);
    setVerify({ status: "success", ms: r.durationMs, raw: r.data });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-5">
        <label className="text-xs text-zinc-500">Threshold (bips)</label>
        <div className="mt-2 flex gap-2">
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="5"
            spellCheck={false}
            disabled={deploy.status === "running"}
            className="w-32 rounded-md border border-zinc-700 bg-transparent px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/60 disabled:opacity-50"
          />
          <button
            onClick={runDeploy}
            disabled={deploy.status === "running"}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 disabled:opacity-40"
          >
            Deploy watch on Flare
          </button>
        </div>
        {/* 감도를 일부러 극단으로 올려놨다는 사실을 화면에 박아둔다 — 영상에서 말로만 하면
            "체리피킹 아니냐"로 들리고, 화면에 적혀 있으면 설계 판단으로 읽힌다. */}
        <div className="mt-3 rounded border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-500/80">
            Demo sensitivity — deliberately extreme
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            A real deployment would set this around <span className="font-mono text-zinc-300">500</span> bips
            (5%) — the size of a drop that actually threatens a position. We run at{" "}
            <span className="font-mono text-zinc-300">{threshold || "5"}</span> bips (
            {((Number(threshold || 5) / 100) || 0.05).toFixed(2)}%), roughly{" "}
            <span className="text-zinc-300">{Math.round(500 / Math.max(Number(threshold) || 5, 1))}x</span>{" "}
            more sensitive, so a live feed trips the policy within minutes instead of once a quarter.
            Nothing else changes: same contract, same tiers, same agent.
          </p>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Coston2 testnet, gas paid in C2FLR — no real funds involved in this track. Contract:{" "}
          <a href={`${EXPLORER}/address/${VAULT_ADDRESS}`} target="_blank" rel="noreferrer" className="underline decoration-zinc-700 hover:decoration-emerald-500">
            {VAULT_ADDRESS.slice(0, 10)}… ↗
          </a>
        </p>
      </section>

      <Step
        index={1}
        title="Deploy the watch"
        subtitle="setPolicy() anchors the real FTSOv2 XRP/USD price at this exact moment on SentinelVault.sol, Coston2."
        status={deploy.status}
        durationMs={deploy.ms}
        rows={deploy.rows}
        raw={deploy.raw}
        rawLabel="Raw setPolicy result"
        error={deploy.err}
      />

      {deploy.status === "success" && (
        <Step
          index={2}
          title="Contract checks itself"
          subtitle="checkAndExecute() is permissionless — anyone can call it. The contract alone decides normal / immediate-defense / escalation; the agent isn't involved yet."
          status={check.status}
          durationMs={check.ms}
          rows={check.rows}
          raw={check.raw}
          rawLabel="Raw checkAndExecute result"
          error={check.err}
        >
          {check.status === "idle" && (
            <div className="mt-4 space-y-3">
              {!watching ? (
                <button
                  onClick={startWatching}
                  className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-300"
                >
                  Watch live XRP/USD price
                </button>
              ) : (
                <div className="rounded border border-zinc-800 bg-zinc-950 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    Watching — free reads, no transaction yet
                  </p>
                  {peek ? (
                    <dl className="mt-2 grid gap-1 font-mono text-[11px]">
                      <div className="flex gap-3">
                        <dt className="w-32 text-zinc-500">Current price</dt>
                        <dd className={peek.dropped ? "text-amber-400" : "text-zinc-300"}>{fmtPrice(peek.currentPrice)}</dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="w-32 text-zinc-500">Anchor price</dt>
                        <dd className="text-zinc-300">{fmtPrice(peek.anchorPrice)}</dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="w-32 text-zinc-500">Deviation</dt>
                        <dd className={peek.readyToCommit ? "text-emerald-400" : "text-zinc-300"}>
                          {peek.deviationBips} bips {peek.readyToCommit && "— inside threshold band"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 font-mono text-[11px] text-zinc-500">Reading…</p>
                  )}
                </div>
              )}
              {/* 커밋 버튼은 관찰을 시작한 뒤에만 나타난다 — 이탈률을 보지 않고 누르면
                  임계 밖에서 tx를 낭비하고, 화면엔 tier=normal만 찍혀 데모가 끊긴다. */}
              {watching && (
                <div className="space-y-2">
                  <button
                    onClick={runCheck}
                    className={`rounded-md px-4 py-2 text-xs font-medium ${
                      peek?.readyToCommit
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    Run checkAndExecute now
                  </button>
                  {peek && !peek.readyToCommit && (
                    <p className="font-mono text-[11px] text-zinc-600">
                      Below the threshold — running now would return{" "}
                      <span className="text-zinc-400">normal</span> and the agent would never be
                      reached. Waiting costs nothing.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tier === "normal" && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500">
                The contract read the price and decided nothing needed doing. That is the outcome
                on most calls, and it is the one a guardian should reach most often — the agent is
                never consulted here.
              </p>
              <button
                onClick={resumeWatching}
                className="mt-3 rounded-md border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-500"
              >
                Keep watching
              </button>
            </div>
          )}
        </Step>
      )}

      {tier === "escalation" && (
        <Step
          index={3}
          title="Agent reads it and decides"
          subtitle="Only reached in the gray zone. Claude reasons from the real deviation and answers with one of seven predefined actions."
          status={verdict ? "success" : "waiting"}
          durationMs={verdictMs}
          raw={verdictRaw ?? undefined}
          rawLabel="Raw response from the model"
          rows={
            verdict
              ? [
                  { label: "Model", value: "claude-opus-5", hint: "A real Anthropic API call, billed per token." },
                  { label: "Severity", value: verdict.severity, strong: true },
                  { label: "Diagnosis", value: verdict.diagnosis, hint: "Its reading of the state, in its own words." },
                  {
                    label: "Action",
                    value: verdict.action,
                    strong: true,
                    hint: "Validated against the fixed enum before being accepted.",
                  },
                  { label: "Rationale", value: verdict.rationale, hint: "Why it chose that." },
                ]
              : undefined
          }
        >
          {!verdict && (
            <div className="mt-4">
              <button
                onClick={runDiagnose}
                disabled={verdictLoading}
                className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:border-sky-400 disabled:opacity-40"
              >
                {verdictLoading ? "Diagnosing…" : "Diagnose with Claude"}
              </button>
              {verdictErr && <p className="mt-2 font-mono text-[11px] text-red-400">Rejected — {verdictErr}</p>}
            </div>
          )}

          {/* 판정이 나온 뒤, 모델에 실제로 보낸 문자열을 그대로 보여준다 — 숫자가 화면의 실측값과
              같다는 걸 눈으로 대조할 수 있어야 "에이전트가 진짜 읽었다"가 성립한다. */}
          {agentPrompt && (
            <details className="mt-4 rounded border border-zinc-800 bg-zinc-950">
              <summary className="cursor-pointer px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400">
                Exact prompt sent to the model
              </summary>
              <pre className="max-h-72 overflow-auto border-t border-zinc-800 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
                {agentPrompt}
              </pre>
            </details>
          )}
        </Step>
      )}

      {tier === "immediate-defense" && (
        <Step
          index={3}
          title="No agent needed"
          subtitle="The drop passed 2x the threshold — the contract locked the position by itself in step 2. This is the deliberate 'obvious case, no LLM' branch."
          status="success"
          rows={[{ label: "isLocked", value: "true", strong: true, hint: "Set entirely inside checkAndExecute — zero LLM calls." }]}
        />
      )}

      {verdict?.action && (
        <Step
          index={4}
          title={needsNoTransaction ? "Nothing to execute" : "Execute it onchain"}
          subtitle={
            needsNoTransaction
              ? "This action is resolved off-chain — SentinelVault only moves state for LOCK_POSITION today, so no transaction is sent."
              : "agentRespond() is restricted to this one whitelisted agent address, and only accepts the fixed enum."
          }
          status={needsNoTransaction ? "success" : exec.status}
          durationMs={needsNoTransaction ? undefined : exec.ms}
          rows={
            needsNoTransaction
              ? [
                  { label: "Verdict", value: verdict.action, strong: true },
                  { label: "Transactions sent", value: "0", hint: "Deciding not to lock is a real outcome, not a failure to run." },
                ]
              : exec.rows
          }
          raw={needsNoTransaction ? undefined : exec.raw}
          rawLabel="Raw agentRespond result"
          error={needsNoTransaction ? undefined : exec.err}
        >
          {!needsNoTransaction && exec.status === "idle" && (
            <button
              onClick={runExecute}
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Execute {verdict.action}
            </button>
          )}
        </Step>
      )}

      {(exec.status === "success" || needsNoTransaction) && verdict && (
        <Step
          index={5}
          title="Confirm the state actually moved"
          subtitle="Reads the same contract again. isLocked only flips if the agent actually chose to lock it."
          status={verify.status}
          durationMs={verify.ms}
          rows={
            lockedAfter !== null
              ? [{ label: "isLocked", value: String(lockedAfter), strong: true, hint: "Read straight from policies() on SentinelVault.sol." }]
              : undefined
          }
          raw={verify.raw}
          rawLabel="Raw policies() result"
          error={verify.err}
        >
          {verify.status !== "running" && verify.status !== "success" && (
            <button
              onClick={runVerify}
              className="mt-4 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Re-read policy
            </button>
          )}
        </Step>
      )}
    </div>
  );
}
