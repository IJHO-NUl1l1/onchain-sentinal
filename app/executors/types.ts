// Executor 추상화. architecture.md §2 [Backend] 몸통 참조.
// 에이전트/백엔드 몸통은 이 인터페이스만 알아야 한다 — KeeperHub/Flare 분기는
// keeperhub.ts / flare.ts 구현체 안에서만 일어난다 (CLAUDE.md "Executor 경계").

// 액션 enum은 아직 미확정 (docs/todo.md "결정 대기" 참조).
// search_protocol_actions 결과 + AssetVault 패턴에서 최종 목록이 나오기 전까지는
// 구체적인 유니온 타입으로 좁히지 않는다 — 지어내지 않기 위함.
export type ActionType = string;

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
