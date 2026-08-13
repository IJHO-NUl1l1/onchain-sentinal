// 🟠 Flare 전용. SentinelVault.sol(Coston2, chainId 114)을 호출한다. architecture.md §3 참조.
// Flare 관련 분기는 이 파일 밖에 두지 않는다.
//
// KeeperHubExecutor가 남의 인프라에 일을 시키는 것과 달리, 여기서는 우리가 배포한 컨트랙트를
// 직접 부른다. 두뇌 입장에서는 둘 다 provisionMonitoring/execute일 뿐이다.
//
// ⚠️ FLR/USD는 매 블록(~1.8초) 갱신돼서 가스 자동견적이 빗나간다(out-of-gas). 항상 명시적 gasLimit.

import { createPublicClient, createWalletClient, decodeEventLog, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flareTestnet } from "viem/chains";
import type { Action, Executor, MonitoringProfile, ProvisionResult, TxResult } from "./types";

const VAULT_ADDRESS = "0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF";
const EXPLORER = "https://coston2-explorer.flare.network";

// "FLR/USD" (21바이트 feed id). architecture.md §3 확정값.
const FLR_USD_FEED_ID = "0x01464c522f55534400000000000000000000000000";

// 하락 임계값 5%. 이 값을 넘으면 에스컬레이션, 2배를 넘으면 컨트랙트가 즉시 방어한다.
const DEFAULT_THRESHOLD_BIPS = BigInt(500);

const GAS_LIMIT = BigInt(300_000);

const vaultAbi = [
  {
    type: "function",
    name: "setPolicy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "feedId", type: "bytes21" },
      { name: "thresholdBips", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "agentRespond",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "action", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "checkAndExecute",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "policies",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "feedId", type: "bytes21" },
      { name: "anchorPrice", type: "uint256" },
      { name: "thresholdBips", type: "uint256" },
      { name: "isLocked", type: "bool" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "ImmediateDefense",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "currentPrice", type: "uint256", indexed: false },
      { name: "deviationBips", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EscalationRequested",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "currentPrice", type: "uint256", indexed: false },
      { name: "deviationBips", type: "uint256", indexed: false },
    ],
  },
] as const;

// Solidity의 ActionType enum 인덱스. SentinelVault.sol의 선언 순서와 반드시 일치해야 한다
// (컨트랙트는 uint8을 받으므로 순서가 어긋나도 조용히 다른 액션이 실행된다).
const ACTION_INDEX: Record<string, number> = {
  NO_ACTION: 0,
  INCREASE_MONITORING: 1,
  SUPPLY_COLLATERAL: 2,
  WITHDRAW_COLLATERAL: 3,
  REPAY_DEBT: 4,
  LOCK_POSITION: 5,
  ACCELERATE_ORACLE: 6,
};

function clients() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) {
    throw new Error("FlareExecutor: DEPLOYER_PRIVATE_KEY is not set (put it in app/.env)");
  }
  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex);
  const transport = http(process.env.COSTON2_RPC_URL || undefined);
  return {
    account,
    wallet: createWalletClient({ account, chain: flareTestnet, transport }),
    pub: createPublicClient({ chain: flareTestnet, transport }),
  };
}

export class FlareExecutor implements Executor {
  /**
   * 감시망 설치 = 컨트랙트에 정책을 심는 것. setPolicy가 호출 시점의 실제 FTSO 가격을
   * anchorPrice로 기록하므로, 이 트랜잭션 하나로 "기준점"이 온체인에 박힌다.
   *
   * ⚠️ 정책은 msg.sender에 귀속된다 — 즉 감시 대상은 서명 지갑 자신이다.
   * KeeperHub 쪽이 Turnkey 지갑에만 방어 가능한 것과 같은 종류의 제약이다.
   */
  async provisionMonitoring(profile: MonitoringProfile): Promise<ProvisionResult> {
    const { wallet, pub, account } = clients();

    const hash = await wallet.writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "setPolicy",
      args: [FLR_USD_FEED_ID, DEFAULT_THRESHOLD_BIPS],
      gas: GAS_LIMIT,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });

    return {
      reference: hash,
      label: `SentinelVault policy for ${account.address} (FLR/USD, 5%)`,
      link: `${EXPLORER}/tx/${hash}`,
      raw: {
        watchedWallet: profile.walletAddress,
        // 정책의 실제 주인. profile.walletAddress와 다를 수 있다(위 주석 참조).
        policyOwner: account.address,
        vault: VAULT_ADDRESS,
        feedId: FLR_USD_FEED_ID,
        thresholdBips: DEFAULT_THRESHOLD_BIPS.toString(),
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }

  /**
   * 에이전트의 판정을 온체인에 반영한다. agentRespond는 화이트리스트 주소만 부를 수 있어서,
   * LLM의 영향력이 "이 주소 + 이 enum"으로 컨트랙트 수준에서 제한된다.
   */
  async execute(action: Action): Promise<TxResult> {
    // KeeperHubExecutor와 같은 판단 — 온체인에서 할 일이 없는 액션에 가스를 쓰지 않는다.
    if (action.type === "NO_ACTION" || action.type === "INCREASE_MONITORING") {
      return { success: true, raw: { note: "no onchain call needed for this action" } };
    }

    const index = ACTION_INDEX[action.type];
    if (index === undefined) {
      throw new Error(`FlareExecutor.execute: unknown action "${action.type}"`);
    }

    const { wallet, pub, account } = clients();
    const user = (action.params.user as string) ?? account.address;

    const hash = await wallet.writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "agentRespond",
      args: [user as Hex, index],
      gas: GAS_LIMIT,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });

    return {
      success: receipt.status === "success",
      transactionLink: `${EXPLORER}/tx/${hash}`,
      raw: {
        action: action.type,
        actionIndex: index,
        user,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      },
    };
  }
}

/**
 * Sets a policy against an arbitrary FTSO feed, bypassing provisionMonitoring's hardcoded
 * FLR/USD default. Used for the Interoperable Asset Products angle — pointing the same vault
 * at XRP/USD, the asset Flare's FAssets bridges onto the chain, with zero contract changes.
 */
export async function setPolicyFor(feedId: string, thresholdBips: bigint): Promise<{ transactionLink: string; anchorPrice: string }> {
  const { wallet, pub } = clients();
  const hash = await wallet.writeContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "setPolicy",
    args: [feedId as Hex, thresholdBips],
    gas: GAS_LIMIT,
  });
  await pub.waitForTransactionReceipt({ hash });
  const policyRaw = await pub.readContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "policies",
    args: [clients().account.address],
  });
  return { transactionLink: `${EXPLORER}/tx/${hash}`, anchorPrice: policyRaw[1].toString() };
}

export interface PolicyState {
  feedId: string;
  anchorPrice: string;
  thresholdBips: string;
  isLocked: boolean;
}

export type CheckResult =
  | { tier: "normal"; policy: PolicyState }
  | { tier: "immediate-defense"; policy: PolicyState; currentPrice: string; deviationBips: string; transactionLink: string }
  | { tier: "escalation"; policy: PolicyState; currentPrice: string; deviationBips: string; transactionLink: string };

/**
 * Calls the permissionless `checkAndExecute` and reports which of the three tiers the contract
 * landed on, by decoding whichever event (if any) it emitted. Not part of the Executor interface —
 * KeeperHub has no equivalent "ask the contract to judge itself" step, since Aave state is read
 * directly by analyzer.ts instead.
 */
export async function checkPolicy(user: string): Promise<CheckResult> {
  const { wallet, pub, account } = clients();
  const target = (user as Hex) ?? account.address;

  const hash = await wallet.writeContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "checkAndExecute",
    args: [target],
    gas: GAS_LIMIT,
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  const transactionLink = `${EXPLORER}/tx/${hash}`;

  const policyRaw = await pub.readContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "policies",
    args: [target],
  });
  const policy: PolicyState = {
    feedId: policyRaw[0],
    anchorPrice: policyRaw[1].toString(),
    thresholdBips: policyRaw[2].toString(),
    isLocked: policyRaw[3],
  };

  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({ abi: vaultAbi, data: log.data, topics: log.topics });
      if (parsed.eventName === "ImmediateDefense") {
        return {
          tier: "immediate-defense",
          policy,
          currentPrice: parsed.args.currentPrice.toString(),
          deviationBips: parsed.args.deviationBips.toString(),
          transactionLink,
        };
      }
      if (parsed.eventName === "EscalationRequested") {
        return {
          tier: "escalation",
          policy,
          currentPrice: parsed.args.currentPrice.toString(),
          deviationBips: parsed.args.deviationBips.toString(),
          transactionLink,
        };
      }
    } catch {
      // not a SentinelVault event (e.g. FTSO system contract logs) — skip
    }
  }

  return { tier: "normal", policy };
}
