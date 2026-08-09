// Executor 추상화. architecture.md §2 [Backend] 몸통 참조.
// 에이전트/백엔드 몸통은 이 인터페이스만 알아야 한다 — KeeperHub/Flare 분기는
// keeperhub.ts / flare.ts 구현체 안에서만 일어난다 (CLAUDE.md "Executor 경계").

// 액션 enum 확정 (8/9). 근거: KeeperHub search_protocol_actions(aave-v3) 실사 +
// architecture.md AssetVault 패턴(deposit/borrow/repay/withdraw+LTV). 매핑표는
// architecture.md §10 참조. `borrow`/`set-collateral`은 방어용 에이전트가 쓸 이유가
// 없어 제외 — 필요해지면 나중에 추가.
export type ActionType =
  | "NO_ACTION"
  | "INCREASE_MONITORING"
  | "SUPPLY_COLLATERAL"
  | "WITHDRAW_COLLATERAL"
  | "REPAY_DEBT"
  | "LOCK_POSITION"
  | "ACCELERATE_ORACLE";

export interface Action {
  type: ActionType;
  params: Record<string, unknown>;
}

// analyzer가 만드는 감시 정책. 필드는 provisionMonitoring 구현이 필요로 하는
// 최소한만 우선 정의하고, analyzer 구현 시점에 맞춰 확장한다.
export interface MonitoringProfile {
  walletAddress: string;
  assets: string[];
}

export interface TxResult {
  success: boolean;
  transactionLink?: string;
  raw?: unknown;
}

export interface Executor {
  /** 감시망 설치. KeeperHub → create_workflow / Flare → setPolicy() */
  provisionMonitoring(profile: MonitoringProfile): Promise<void>;
  /** 대응 실행. KeeperHub → execute_check_and_execute 등 / Flare → agentRespond() */
  execute(action: Action): Promise<TxResult>;
}
