// 🟠 Flare 전용. architecture.md §3 "Flare 기술 스펙" 참조.
// 이 파일 밖(agent/, app/app/ 라우트)에는 Flare 관련 분기를 두지 않는다.
//
// ethers로 SentinelVault.sol(Coston2, chainId 114) 트랜잭션을 보낸다.
// 컨트랙트 자체(SentinelVault.sol)가 아직 없어 ABI/주소가 확정되지 않았다 —
// contracts/ 배포 완료(Phase D) 후 SENTINEL_VAULT_ADDRESS를 .env에서 읽어 연결한다.

import type { Action, Executor, MonitoringProfile, TxResult } from "./types";

export class FlareExecutor implements Executor {
  async provisionMonitoring(_profile: MonitoringProfile): Promise<void> {
    // TODO(Phase D): SentinelVault.setPolicy() 호출. 컨트랙트 배포 후 구현.
    throw new Error("FlareExecutor.provisionMonitoring: not implemented (Phase D)");
  }

  async execute(_action: Action): Promise<TxResult> {
    // TODO(Phase D): SentinelVault.agentRespond() 호출.
    // 급변 감지 시 offerIncentive()(Volatility Incentive)도 이 경로에서 다룬다.
    throw new Error("FlareExecutor.execute: not implemented (Phase D)");
  }
}
