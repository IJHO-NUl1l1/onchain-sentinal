// 🔵 KeeperHub 전용. architecture.md §3 "KeeperHub 기술 스펙" 참조.
// 이 파일 밖(agent/, app/app/ 라우트)에는 KeeperHub 관련 분기를 두지 않는다.
//
// MCP HTTP(https://app.keeperhub.com/mcp)에 헤드리스로 붙는다
// (architecture.md "헤드리스는 --header Authorization: Bearer kh_...").
//
// 워크플로우 node/edge의 정확한 형태(트리거 config, 액션 노드의 actionType/_protocolMeta 등)는
// architecture.md에 스키마 수준까지는 없어서, 실제 MCP 세션에서 list_workflows로 기존
// "Aave Health Factor Monitor" 워크플로우를 조회해 그 구조를 그대로 가져왔다 — 지어내지 않았다.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Action, ActionType, Executor, MonitoringProfile, TxResult } from "./types";

// callTool()의 반환 타입을 SDK의 Client 클래스에서 그대로 뽑아 쓴다 — 버전마다
// CallToolResult 유니온이 조금씩 달라서 직접 import한 타입과 어긋날 수 있기 때문.
type CallToolReturn = Awaited<ReturnType<Client["callTool"]>>;

const MCP_URL = "https://app.keeperhub.com/mcp";
const DEV_CHAIN_ID = process.env.KEEPERHUB_DEV_CHAIN_ID ?? "11155111";

// architecture.md §10 매핑표. ACCELERATE_ORACLE은 Flare 전용이라 여기 없다 —
// 호출되면 execute()가 명시적으로 거부한다.
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

// CallToolResult 응답 형태(content/isError/structuredContent)는 MCP SDK 타입에서 확인한
// 것이고, KeeperHub가 transactionLink를 어느 필드에 담아 돌려주는지는 미확인이라
// structuredContent에서 최대한 방어적으로만 꺼낸다 — 없으면 raw를 그대로 남겨서
// 나중에 실제 응답 보고 고칠 수 있게 한다.
function toTxResult(result: CallToolReturn): TxResult {
  const structured = "structuredContent" in result ? result.structuredContent : undefined;
  const transactionLink =
    structured && typeof structured === "object" && "transactionLink" in structured
      ? String((structured as Record<string, unknown>).transactionLink)
      : undefined;
  return {
    success: result.isError !== true,
    transactionLink,
    raw: structured ?? ("content" in result ? result.content : result),
  };
}

export class KeeperHubExecutor implements Executor {
  async provisionMonitoring(profile: MonitoringProfile): Promise<void> {
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

      await client.callTool({
        name: "create_workflow",
        arguments: {
          name: `sentinel-${profile.walletAddress}`,
          description: `Sentinel이 자동 생성한 감시망 — ${profile.walletAddress}`,
          nodes,
          edges,
          enabled: true,
          idempotency_key: `provision-${profile.walletAddress}`,
        },
      });
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

    const client = await connect();
    try {
      const result = await client.callTool({
        name: "execute_protocol_action",
        arguments: {
          actionType,
          params: { network: DEV_CHAIN_ID, ...action.params },
        },
      });
      return toTxResult(result);
    } finally {
      await client.close();
    }
  }
}
