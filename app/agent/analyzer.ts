// 🟢 analyzer: 지갑 조회 → 리스크 프로파일. architecture.md §2 [Agent].
// "지갑 조회(viem/ethers, 둘 다 EVM)"(architecture.md §2 [Backend] 몸통) 원칙대로
// viem으로 직접 온체인을 읽는다 — KeeperHub MCP를 호출하지 않는다. analyzer는
// 🟢 공유 코드라 특정 executor(KeeperHub)에 종속된 방식을 쓰면 안 되기 때문
// (CLAUDE.md "Executor 경계").

import { createPublicClient, formatEther, formatUnits, http, isAddress } from "viem";
import { base, sepolia } from "viem/chains";
import type { MonitoringProfile } from "../executors/types";

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function analyzeWallet(walletAddress: string): Promise<MonitoringProfile> {
  if (!isAddress(walletAddress)) {
    throw new Error(`analyzeWallet: invalid address "${walletAddress}"`);
  }

  const balanceWei = await sepoliaClient.getBalance({ address: walletAddress });
  const assets = balanceWei > BigInt(0) ? ["ETH"] : [];

  return { walletAddress, assets };
}

// 디버그/수동 확인용. 실제 밸런스가 찍히는지 확인할 때 씀.
export async function getNativeBalance(walletAddress: string): Promise<string> {
  if (!isAddress(walletAddress)) {
    throw new Error(`getNativeBalance: invalid address "${walletAddress}"`);
  }
  const balanceWei = await sepoliaClient.getBalance({ address: walletAddress });
  return formatEther(balanceWei);
}

// ── Aave v3 실데이터 조회 (Base) ──────────────────────────────────────
// architecture.md §0-1 "핵심 판단 기준" 1번 축: 진짜 온체인 데이터.
// Pool 주소는 aave-address-book(AaveV3Base.sol)에서 가져온 뒤 8/9에
// getReservesList()/getConfiguration()으로 직접 온체인 대조해 확정함
// (Sepolia에서 문서-실제 불일치를 겪은 뒤라 반드시 이 단계를 거쳤다).

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

const BASE_AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

const poolAbi = [
  {
    type: "function",
    name: "getUserAccountData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
] as const;

export interface AaveAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}

export async function getAaveAccountData(walletAddress: string): Promise<AaveAccountData> {
  if (!isAddress(walletAddress)) {
    throw new Error(`getAaveAccountData: invalid address "${walletAddress}"`);
  }

  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = await baseClient.readContract({
    address: BASE_AAVE_POOL,
    abi: poolAbi,
    functionName: "getUserAccountData",
    args: [walletAddress],
  });

  return {
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  };
}

// diagnoser 프롬프트에 붙여넣기 좋은 사람이 읽을 수 있는 형태로 변환.
// totalCollateralBase 등은 Aave "base currency" 기준 8자리 소수(대략 USD),
// healthFactor는 18자리 소수(1e18 = 1.0).
export function formatAaveAccountData(data: AaveAccountData): string {
  const hf =
    data.healthFactor > BigInt(2) ** BigInt(255)
      ? "infinite (no debt)"
      : formatUnits(data.healthFactor, 18);
  return [
    `Total collateral (base): ${formatUnits(data.totalCollateralBase, 8)}`,
    `Total debt (base): ${formatUnits(data.totalDebtBase, 8)}`,
    `Health factor: ${hf}`,
    `LTV: ${(Number(data.ltv) / 100).toFixed(2)}%`,
    `Liquidation threshold: ${(Number(data.currentLiquidationThreshold) / 100).toFixed(2)}%`,
  ].join("\n");
}
