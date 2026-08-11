"use server";

// 데모 콘솔의 서버 진입점. architecture.md §8-2의 5막을 각각 하나의 서버 액션으로 나눴다.
// 클라이언트가 한 단계씩 순서대로 부르므로 화면에 뜨는 순서 = 실제 실행 순서다(연출 아님).
//
// bigint는 서버 액션 경계를 못 넘으니 전부 문자열로 직렬화해서 넘긴다.

import { formatUnits } from "viem";
import { analyzeWallet, getAaveAccountData } from "../../agent/analyzer";
import { KeeperHubExecutor } from "../../executors/keeperhub";
import type { Action, ActionType, MonitoringProfile } from "../../executors/types";

/** Aave 계정 상태의 직렬화 가능한 스냅샷. 원본 uint256도 같이 보여준다(날것 노출). */
export interface AaveSnapshot {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactorRaw: string;
  /** 사람이 읽는 값. 부채가 없으면 Aave가 uint256 최댓값을 돌려준다 */
  healthFactor: string;
  collateralUsd: string;
  debtUsd: string;
  ltvPercent: string;
  liquidationThresholdPercent: string;
}

export interface StepPayload<T> {
  ok: boolean;
  durationMs: number;
  data?: T;
  error?: string;
  /** 화면에 그대로 뿌릴 원본 응답 */
  raw?: unknown;
}

const NO_DEBT_SENTINEL = BigInt(2) ** BigInt(255);

function toSnapshot(d: Awaited<ReturnType<typeof getAaveAccountData>>): AaveSnapshot {
  return {
    totalCollateralBase: d.totalCollateralBase.toString(),
    totalDebtBase: d.totalDebtBase.toString(),
    availableBorrowsBase: d.availableBorrowsBase.toString(),
    currentLiquidationThreshold: d.currentLiquidationThreshold.toString(),
    ltv: d.ltv.toString(),
    healthFactorRaw: d.healthFactor.toString(),
    healthFactor:
      d.healthFactor > NO_DEBT_SENTINEL ? "∞ (no debt)" : Number(formatUnits(d.healthFactor, 18)).toFixed(4),
    // Aave base currency = 가격피드 기준 8자리 소수 (≈USD)
    collateralUsd: Number(formatUnits(d.totalCollateralBase, 8)).toFixed(2),
    debtUsd: Number(formatUnits(d.totalDebtBase, 8)).toFixed(2),
    ltvPercent: (Number(d.ltv) / 100).toFixed(2),
    liquidationThresholdPercent: (Number(d.currentLiquidationThreshold) / 100).toFixed(2),
  };
}

async function timed<T>(fn: () => Promise<T>): Promise<StepPayload<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    return { ok: true, durationMs: Date.now() - started, data };
  } catch (err) {
    return {
      ok: false,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 1막 — 지갑의 실제 온체인 상태를 읽는다 (§0-1 1번 축) */
export async function stepAnalyze(
  address: string,
): Promise<StepPayload<{ profile: MonitoringProfile; snapshot: AaveSnapshot }>> {
  return timed(async () => {
    const [profile, aave] = await Promise.all([analyzeWallet(address), getAaveAccountData(address)]);
    return { profile, snapshot: toSnapshot(aave) };
  });
}

/** 1막 — 읽은 상태를 근거로 감시망을 설계해 KeeperHub에 배치한다 */
export async function stepProvision(profile: MonitoringProfile) {
  return timed(async () => {
    const executor = new KeeperHubExecutor();
    return executor.provisionMonitoring(profile);
  });
}

/** 3막 — 에이전트가 고른 액션을 온체인에서 실행한다 (§0-1 2번 축의 종착점) */
export async function stepExecute(actionType: ActionType, params: Record<string, unknown>) {
  return timed(async () => {
    const executor = new KeeperHubExecutor();
    const action: Action = { type: actionType, params };
    return executor.execute(action);
  });
}

/** 4막 — 대응 이후 상태를 다시 읽어 실제로 바뀌었는지 확인한다 */
export async function stepVerify(address: string): Promise<StepPayload<AaveSnapshot>> {
  return timed(async () => toSnapshot(await getAaveAccountData(address)));
}
