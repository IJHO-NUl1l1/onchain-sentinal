// 🔵 KeeperHub 전용. architecture.md §3 "KeeperHub 기술 스펙" 참조.
// 이 파일 밖(agent/, app/app/ 라우트)에는 KeeperHub 관련 분기를 두지 않는다.
//
// 연결 방식: MCP HTTP (https://app.keeperhub.com/mcp), 헤드리스 인증은
// `Authorization: Bearer ${KEEPERHUB_API_KEY}` (architecture.md §3, "헤드리스는 --header").
// 실제 MCP 클라이언트 연결 + create_workflow / execute_check_and_execute 호출은
// Phase C 작업 항목 (docs/todo.md) — 여기서는 Executor 계약과 파일 위치만 고정한다.

import type { Action, Executor, MonitoringProfile, TxResult } from "./types";

export class KeeperHubExecutor implements Executor {
  async provisionMonitoring(_profile: MonitoringProfile): Promise<void> {
    // TODO(Phase C): create_workflow 호출. 함정 10개(architecture.md §3) 반드시 준수:
    // abi/functionArgs는 JSON.stringify 문자열, gasLimitMultiplier/network는 문자열,
    // simulate는 JSON 불리언, recipientAddress는 EIP-55 체크섬.
    throw new Error("KeeperHubExecutor.provisionMonitoring: not implemented (Phase C)");
  }

  async execute(_action: Action): Promise<TxResult> {
    // TODO(Phase C): execute_check_and_execute / execute_protocol_action.
    // 안전 절차(architecture.md §3): simulate:true → success && !wouldRevert 확인
    // → idempotency_key로 재호출 → get_direct_execution_status 폴링 → transactionLink 보관.
    throw new Error("KeeperHubExecutor.execute: not implemented (Phase C)");
  }
}
