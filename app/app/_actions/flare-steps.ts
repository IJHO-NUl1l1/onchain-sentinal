"use server";

// Flare 콘솔의 서버 진입점. run-steps.ts와 대칭 구조 — 5막을 서버 액션 하나씩으로 나눴다.
// 데이터 소스가 Aave 포지션이 아니라 FTSO 가격이라 스냅샷 형태가 다르다.

import { askAgent } from "../../agent/claude";
import { buildFlareAgentPrompt, parseVerdict, type Verdict } from "../../agent/prompt";
import {
  FlareExecutor,
  XRP_USD_FEED_ID,
  checkPolicy,
  depositToVault,
  readLivePrice,
  readPolicy,
  readVaultBalance,
  setPolicyFor,
  tryWithdraw,
  type CheckResult,
} from "../../executors/flare";
import type { Action, ActionType } from "../../executors/types";

export interface StepPayload<T> {
  ok: boolean;
  durationMs: number;
  data?: T;
  error?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<StepPayload<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    return { ok: true, durationMs: Date.now() - started, data };
  } catch (err) {
    return { ok: false, durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 1막 — 진짜 자산을 금고에 예치한다. 이게 뒤에서 잠기거나 풀리는 실물이다. */
export async function flareStepDeposit(amountEther: string) {
  return timed(async () => {
    const wei = BigInt(Math.floor(Number(amountEther) * 1e18));
    return depositToVault(wei);
  });
}

/** 2막 — 감시망 설치. setPolicy가 호출 시점의 실제 FTSO 가격을 anchor로 기록한다. */
export async function flareStepDeploy(thresholdBips: string) {
  return timed(async () => setPolicyFor(XRP_USD_FEED_ID, BigInt(thresholdBips)));
}

/**
 * 2막 폴링용 — 실제 tx 없이 무료로 현재 이탈률을 계산한다(FeedCheck.sol의 view 호출 + 오프체인
 * 연산). SentinelVault는 하락만 감시하므로 dropped=false면 deviationBips는 항상 0이다.
 */
export async function flareStepPeek(user: string) {
  return timed(async () => {
    const policy = await readPolicy(user);
    const live = await readLivePrice(policy.feedId);
    const anchor = BigInt(policy.anchorPrice);
    const current = BigInt(live.value);
    const threshold = BigInt(policy.thresholdBips || "0");
    const dropped = current < anchor;
    const deviationBips = dropped ? ((anchor - current) * BigInt(10000)) / anchor : BigInt(0);
    // 컨트랙트의 3단 판정을 tx 없이 미리 계산한다. "임계 이상"만 보면 회색지대와 즉시방어가
    // 한 덩어리가 되는데, 그 둘은 에이전트를 부르냐 마냐가 갈리는 완전히 다른 결과다.
    const zone: "normal" | "gray" | "immediate" =
      !dropped || deviationBips < threshold
        ? "normal"
        : deviationBips >= threshold * BigInt(2)
          ? "immediate"
          : "gray";
    return {
      currentPrice: current.toString(),
      anchorPrice: anchor.toString(),
      thresholdBips: threshold.toString(),
      dropped,
      deviationBips: deviationBips.toString(),
      zone,
      readyToCommit: zone !== "normal",
    };
  });
}

/** 2막 커밋 — 퍼미션리스 checkAndExecute를 실제로 쏜다. 정상/즉시방어/에스컬레이션 중 판정. */
export async function flareStepCheck(user: string): Promise<StepPayload<CheckResult>> {
  return timed(async () => checkPolicy(user));
}

/** 3막 — 에스컬레이션 데이터를 프롬프트로 조립해 Claude를 부르고 검증한다. */
export async function flareStepDiagnose(
  policy: { feedId: string; thresholdBips: string; anchorPrice: string },
  currentPrice: string,
  deviationBips: string,
) {
  return timed(async () => {
    const prompt = buildFlareAgentPrompt(policy, JSON.stringify({ currentPrice, deviationBips }, null, 2));
    const raw = await askAgent(prompt);
    const parsed = parseVerdict(raw);
    if (!parsed.ok) {
      throw new Error(`Agent verdict rejected: ${parsed.error}`);
    }
    return { verdict: parsed.verdict as Verdict, prompt, raw };
  });
}

/** 4막 — 에이전트의 판정을 온체인에 반영한다. */
export async function flareStepExecute(actionType: ActionType, user: string) {
  return timed(async () => {
    const executor = new FlareExecutor();
    const action: Action = { type: actionType, params: { user } };
    return executor.execute(action);
  });
}

/** 6막 — 정책 상태를 다시 읽어 실제로 바뀌었는지 확인한다. */
export async function flareStepVerify(user: string) {
  return timed(async () => readPolicy(user));
}

/**
 * 7막 — 진짜 출구 시험. 잠겨 있으면 컨트랙트가 되돌린다(`PositionLocked`) — 실패를 예외가
 * 아니라 결과로 돌려줘서 화면에 그대로 보여준다. 이게 방어가 플래그가 아니라 자금의 문이라는 증거.
 */
export async function flareStepTryWithdraw(amountEther: string) {
  return timed(async () => {
    const wei = BigInt(Math.floor(Number(amountEther) * 1e18));
    return tryWithdraw(wei);
  });
}

export async function flareStepBalance(user: string) {
  return timed(async () => readVaultBalance(user));
}
