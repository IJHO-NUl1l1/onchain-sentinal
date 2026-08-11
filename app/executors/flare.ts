// 🟠 Flare 전용. architecture.md §3 "Flare 기술 스펙" 참조.
// 이 파일 밖(agent/, app/app/ 라우트)에는 Flare 관련 분기를 두지 않는다.
//
// ethers로 SentinelVault.sol(Coston2, chainId 114) 트랜잭션을 보낸다.
// 컨트랙트는 8/9에 Coston2 배포 완료(0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF, architecture.md §3).
// 지금은 `contracts/scripts/demo-provision-and-check.ts`가 컨트랙트를 직접 호출하고 있어
// 이 executor를 안 거친다 — CLAUDE.md "Executor 경계" 위반 상태다. setPolicy/agentRespond를
// 여기로 옮기는 게 남은 작업(todo.md Phase D 최우선).
// ⚠️ checkAndExecute는 가스 자동견적이 불안정하니 명시적 gasLimit 필수(§3).

import type { Action, Executor, MonitoringProfile, ProvisionResult, TxResult } from "./types";

export class FlareExecutor implements Executor {
  async provisionMonitoring(_profile: MonitoringProfile): Promise<ProvisionResult> {
    // TODO(Phase D): SentinelVault.setPolicy() 호출. 컨트랙트 배포 후 구현.
    throw new Error("FlareExecutor.provisionMonitoring: not implemented (Phase D)");
  }

  async execute(_action: Action): Promise<TxResult> {
    // TODO(Phase D): SentinelVault.agentRespond() 호출.
    // 급변 감지 시 offerIncentive()(Volatility Incentive)도 이 경로에서 다룬다.
    throw new Error("FlareExecutor.execute: not implemented (Phase D)");
  }
}
