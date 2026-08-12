// 🔵 KeeperHub 전용. MCP HTTP에 헤드리스로 붙는다. architecture.md §3 참조.
// KeeperHub 관련 분기는 이 파일 밖에 두지 않는다.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  Action,
  ActionType,
  Executor,
  MonitoringProfile,
  ProvisionResult,
  TxResult,
} from "./types";

// SDK 버전마다 CallToolResult 유니온이 달라서 Client에서 직접 뽑아 쓴다.
type CallToolReturn = Awaited<ReturnType<Client["callTool"]>>;

const MCP_URL = "https://app.keeperhub.com/mcp";
const DEV_CHAIN_ID = process.env.KEEPERHUB_DEV_CHAIN_ID ?? "8453";

// 실행 지갑(Turnkey EOA). KeeperHub가 서명 가능한 지갑이 이것뿐이라 포지션 주인도 항상 이 주소다.
// ⚠️ 엄격한 EIP-55 체크섬 검증을 받는다 — 체크섬 형태 그대로 넣을 것.
function executorAddress(): string {
  const addr = process.env.KEEPERHUB_EXECUTOR_ADDRESS;
  if (!addr) {
    throw new Error(
      "KeeperHubExecutor: KEEPERHUB_EXECUTOR_ADDRESS is not set (the Turnkey wallet address)",
    );
  }
  return addr;
}

// architecture.md §10 매핑표. ACCELERATE_ORACLE은 Flare 전용이라 없다.
const ACTION_TYPE_MAP: Partial<Record<ActionType, string>> = {
  SUPPLY_COLLATERAL: "aave-v3/supply",
  WITHDRAW_COLLATERAL: "aave-v3/withdraw",
  REPAY_DEBT: "aave-v3/repay",
  LOCK_POSITION: "aave-v3/withdraw", // "전액 인출로 흉내" (architecture.md §10)
};

async function connect(): Promise<Client> {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) {
    throw new Error("KeeperHubExecutor: KEEPERHUB_API_KEY is not set");
  }
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "sentinel", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

// ⚠️ KeeperHub는 MCP의 isError를 안 쓴다. 실패도 content[0].text 안에 {success:false}로 온다.
function parseBody(result: CallToolReturn): Record<string, unknown> | undefined {
  if ("structuredContent" in result && result.structuredContent) {
    return result.structuredContent as Record<string, unknown>;
  }
  if ("content" in result && Array.isArray(result.content)) {
    const first = result.content[0];
    if (first && first.type === "text") {
      try {
        return JSON.parse(first.text) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

// `execute_protocol_action`은 `result` 아래 중첩, 워크플로우 실행 경로는 평평하게 준다. 둘 다 본다.
function pickTransactionLink(body: Record<string, unknown> | undefined): string | undefined {
  if (!body) return undefined;
  if (typeof body.transactionLink === "string") return body.transactionLink;
  const nested = body.result;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const link = (nested as Record<string, unknown>).transactionLink;
    if (typeof link === "string") return link;
  }
  return undefined;
}

function toTxResult(result: CallToolReturn): TxResult {
  const body = parseBody(result);
  // 본문을 못 읽으면 실패로 본다 — 방어 시스템에서 실패를 성공으로 보고하는 게 최악의 실패 모드다.
  const success =
    result.isError !== true && body !== undefined && (body.success === undefined || body.success === true);
  const transactionLink = pickTransactionLink(body);

  return {
    success,
    transactionLink,
    raw: body ?? ("content" in result ? result.content : result),
  };
}

export class KeeperHubExecutor implements Executor {
  async provisionMonitoring(profile: MonitoringProfile): Promise<ProvisionResult> {
    const client = await connect();
    try {
      const nodes = [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: {
            type: "trigger",
            label: "Trigger",
            config: {
              triggerType: "Schedule",
              scheduleCron: "0 * * * *",
              scheduleTimezone: "UTC",
            },
            status: "idle",
          },
        },
        {
          id: "step-1",
          type: "action",
          position: { x: 252, y: 0 },
          data: {
            type: "action",
            label: "Get Aave Health Factor",
            description: "Read the health factor from Aave v3 for the monitored wallet",
            config: {
              user: profile.walletAddress,
              network: DEV_CHAIN_ID,
              actionType: "aave-v3/get-user-account-data",
              _protocolMeta: JSON.stringify({
                protocolSlug: "aave-v3",
                contractKey: "pool",
                functionName: "getUserAccountData",
                actionType: "read",
              }),
            },
            status: "idle",
          },
        },
      ];
      const edges = [{ id: "e-trigger-1-step-1", source: "trigger-1", target: "step-1" }];

      const created = await client.callTool({
        name: "create_workflow",
        arguments: {
          name: `sentinel-${profile.walletAddress}`,
          description: `Watch designed and deployed by Sentinel for ${profile.walletAddress}`,
          nodes,
          edges,
          enabled: true,
          idempotency_key: `provision-${profile.walletAddress}`,
        },
      });

      const body = parseBody(created);
      const workflowId = typeof body?.id === "string" ? body.id : undefined;
      return {
        reference: workflowId,
        label: typeof body?.name === "string" ? body.name : undefined,
        link: workflowId ? `https://app.keeperhub.com/workflows/${workflowId}` : undefined,
        raw: body ?? created,
      };
    } finally {
      await client.close();
    }
  }

  async execute(action: Action): Promise<TxResult> {
    if (action.type === "NO_ACTION" || action.type === "INCREASE_MONITORING") {
      return { success: true, raw: { note: "no KeeperHub call needed for this action" } };
    }

    const actionType = ACTION_TYPE_MAP[action.type];
    if (!actionType) {
      throw new Error(
        `KeeperHubExecutor.execute: no KeeperHub mapping for "${action.type}" (architecture.md §10 — likely Flare-only)`,
      );
    }

    // 액션별 기본값. 호출자가 넘긴 값이 우선한다.
    // ⚠️ 아래 필드들은 KeeperHub 스키마상 optional로 나오지만 실제로는 빠지면 거부되거나
    // 잘못된 기본값이 잡힌다(referralCode 누락 시 422, interestRateMode는 항상 2=variable).
    const defaults: Record<string, unknown> = {};
    if (actionType === "aave-v3/supply") {
      defaults.referralCode = "0";
      defaults.onBehalfOf = executorAddress();
    } else if (actionType === "aave-v3/repay") {
      defaults.interestRateMode = "2";
      defaults.onBehalfOf = executorAddress();
    } else if (actionType === "aave-v3/withdraw") {
      defaults.to = executorAddress();
    }

    const client = await connect();
    try {
      const result = await client.callTool({
        name: "execute_protocol_action",
        arguments: {
          actionType,
          params: { network: DEV_CHAIN_ID, ...defaults, ...action.params },
        },
      });
      return toTxResult(result);
    } finally {
      await client.close();
    }
  }
}
