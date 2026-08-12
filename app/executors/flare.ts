// 🟠 Flare 전용. SentinelVault.sol(Coston2, chainId 114)을 호출한다. architecture.md §3 참조.
// Flare 관련 분기는 이 파일 밖에 두지 않는다.
// ⚠️ 미구현 — 지금은 contracts/scripts/demo-provision-and-check.ts가 컨트랙트를 직접 호출해
//    executor 경계를 우회하고 있다. setPolicy/agentRespond를 여기로 옮기는 게 남은 작업.
// ⚠️ checkAndExecute는 가스 자동견적이 불안정하니 명시적 gasLimit 필수.

import type { Action, Executor, MonitoringProfile, ProvisionResult, TxResult } from "./types";

export class FlareExecutor implements Executor {
  async provisionMonitoring(_profile: MonitoringProfile): Promise<ProvisionResult> {
    // TODO: SentinelVault.setPolicy() 호출
    throw new Error("FlareExecutor.provisionMonitoring: not implemented (Phase D)");
  }

  async execute(_action: Action): Promise<TxResult> {
    // TODO: SentinelVault.agentRespond() 호출 (급변 시 offerIncentive()도 이 경로)
    throw new Error("FlareExecutor.execute: not implemented (Phase D)");
  }
}
