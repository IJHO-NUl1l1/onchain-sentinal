// 🟢 analyzer: 지갑 조회 → 리스크 프로파일.
// viem으로 직접 온체인을 읽는다 — 공유 코드라 특정 executor(KeeperHub MCP)에 종속되면 안 된다.

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
// Pool 주소는 aave-address-book 값을 온체인 조회로 대조해 확정한 것.

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

// 사람이 읽는 형태로 변환. base currency는 8자리 소수(≈USD), healthFactor는 18자리(1e18 = 1.0).
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
