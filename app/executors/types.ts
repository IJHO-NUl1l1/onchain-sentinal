// Executor 추상화. 몸통은 이 인터페이스만 알고, KeeperHub/Flare 분기는 구현체 안에서만 일어난다.

// LLM이 고를 수 있는 액션의 전체 집합. executor별 매핑표는 architecture.md §10.
export type ActionType =
  | "NO_ACTION"
  | "INCREASE_MONITORING"
  | "SUPPLY_COLLATERAL"
  | "WITHDRAW_COLLATERAL"
  | "REPAY_DEBT"
  | "LOCK_POSITION"
  | "ACCELERATE_ORACLE";

export const ACTION_TYPES: readonly ActionType[] = [
  "NO_ACTION",
  "INCREASE_MONITORING",
  "SUPPLY_COLLATERAL",
  "WITHDRAW_COLLATERAL",
  "REPAY_DEBT",
  "LOCK_POSITION",
  "ACCELERATE_ORACLE",
];

// enum 밖 값을 걸러내는 모든 지점이 이 함수를 써야 한다. 목록을 따로 베끼면 하나만 바뀐다.
export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

export interface Action {
  type: ActionType;
  params: Record<string, unknown>;
}

// analyzer가 만드는 감시 정책.
export interface MonitoringProfile {
  walletAddress: string;
  assets: string[];
}

export interface TxResult {
  success: boolean;
  transactionLink?: string;
  raw?: unknown;
}

/** 감시망 설치 결과. "설치됐다"의 증거가 executor마다 달라서(워크플로우 id / tx 해시) 참조 하나로 추상화한다. */
export interface ProvisionResult {
  reference?: string;
  label?: string;
  link?: string;
  raw?: unknown;
}

export interface Executor {
  /** KeeperHub → create_workflow / Flare → setPolicy() */
  provisionMonitoring(profile: MonitoringProfile): Promise<ProvisionResult>;
  /** KeeperHub → execute_protocol_action / Flare → agentRespond() */
  execute(action: Action): Promise<TxResult>;
}
