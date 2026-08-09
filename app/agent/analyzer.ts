// 🟢 analyzer: 지갑 조회 → 리스크 프로파일. architecture.md §2 [Agent].
// "지갑 조회(viem/ethers, 둘 다 EVM)"(architecture.md §2 [Backend] 몸통) 원칙대로
// viem으로 직접 온체인을 읽는다 — KeeperHub MCP를 호출하지 않는다. analyzer는
// 🟢 공유 코드라 특정 executor(KeeperHub)에 종속된 방식을 쓰면 안 되기 때문
// (CLAUDE.md "Executor 경계").
//
// 현재 스코프: 네이티브 잔고만. Aave v3 포지션(health factor 등) 조회는 아직 안 함 —
// Sepolia Aave v3 Pool 컨트랙트 주소가 architecture.md에 없는 값이라 지어내지 않고
// 후속 작업으로 미뤘다 (docs/todo.md 참조).

import { createPublicClient, formatEther, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import type { MonitoringProfile } from "../executors/types";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function analyzeWallet(walletAddress: string): Promise<MonitoringProfile> {
  if (!isAddress(walletAddress)) {
    throw new Error(`analyzeWallet: invalid address "${walletAddress}"`);
  }

  const balanceWei = await client.getBalance({ address: walletAddress });
  const assets = balanceWei > BigInt(0) ? ["ETH"] : [];

  return { walletAddress, assets };
}

// 디버그/수동 확인용. 실제 밸런스가 찍히는지 확인할 때 씀.
export async function getNativeBalance(walletAddress: string): Promise<string> {
  if (!isAddress(walletAddress)) {
    throw new Error(`getNativeBalance: invalid address "${walletAddress}"`);
  }
  const balanceWei = await client.getBalance({ address: walletAddress });
  return formatEther(balanceWei);
}
