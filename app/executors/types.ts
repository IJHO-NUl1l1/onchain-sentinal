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

const ACTION_TYPES: readonly ActionType[] = [
  "NO_ACTION",
  "INCREASE_MONITORING",
  "SUPPLY_COLLATERAL",
  "WITHDRAW_COLLATERAL",
  "REPAY_DEBT",
  "LOCK_POSITION",
  "ACCELERATE_ORACLE",
];

// 단일 진실 공급원 — enum 밖 값을 걸러내는 모든 지점(데모 스크립트, 콘솔 UI)이
// 이 함수를 써야 한다. 각자 따로 목록을 베끼면 하나가 바뀔 때 나머지가 안 바뀌는
// 사고가 난다(8/11 발견: 콘솔 UI가 이 검증을 아예 안 하고 있었다).
export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

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

/**
 * 감시망 설치 결과. executor마다 "설치됐다"의 증거가 다르다 —
 * KeeperHub는 워크플로우 id, Flare는 setPolicy 트랜잭션 해시.
 * 어느 쪽이든 사람이 확인할 수 있는 참조 하나 + 원본 응답을 돌려준다.
 * (데모 콘솔이 중간 과정을 날것으로 보여주려면 이 정보가 필요하다)
 */
export interface ProvisionResult {
  /** 사람이 식별하는 참조 — 워크플로우 id / tx 해시 */
  reference?: string;
  /** 사람이 읽는 이름 — 워크플로우 이름 등 */
  label?: string;
  /** 외부에서 확인 가능한 링크 (대시보드 / 익스플로러) */
  link?: string;
  /** 원본 응답 그대로 */
  raw?: unknown;
}

export interface Executor {
  /** 감시망 설치. KeeperHub → create_workflow / Flare → setPolicy() */
  provisionMonitoring(profile: MonitoringProfile): Promise<ProvisionResult>;
  /** 대응 실행. KeeperHub → execute_check_and_execute 등 / Flare → agentRespond() */
  execute(action: Action): Promise<TxResult>;
}
