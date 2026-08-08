// 🟢 analyzer: 지갑 조회 → 리스크 프로파일. architecture.md §2 [Agent].
// viem/ethers로 지갑 상태(자산 구성, 프로토콜 포지션 등)를 읽어
// executors가 provisionMonitoring에 쓸 MonitoringProfile을 만든다.

import type { MonitoringProfile } from "../executors/types";

export async function analyzeWallet(_walletAddress: string): Promise<MonitoringProfile> {
  // TODO(Phase B): viem/ethers로 지갑 조회 구현. 프로토콜 포지션(Aave 등)
  // 확인 방법은 MVP 감시 범위 결정(docs/todo.md "결정 대기") 이후 확정.
  throw new Error("analyzeWallet: not implemented");
}
