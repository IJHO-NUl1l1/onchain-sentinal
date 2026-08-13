// Raw execute_contract_call runner via the org API key (KEEPERHUB_API_KEY), for actions
// that have no slot in the ActionType enum yet (approve, borrow). Bypasses the write-401
// that Claude Code's own OAuth MCP session hits (architecture.md §3 / todo.md 8/12).
//
// 사용법: npm run demo:raw-call -- <contractAddress> <functionName> '<functionArgsJson>' [valueEther]

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://app.keeperhub.com/mcp";
const CHAIN_ID = "8453";

async function main() {
  const [contractAddress, functionName, functionArgsJson, value] = process.argv.slice(2);
  if (!contractAddress || !functionName) {
    console.error(
      `Usage: npm run demo:raw-call -- <contractAddress> <functionName> '<functionArgsJson>' [valueEther]`,
    );
    process.exit(1);
  }

  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) throw new Error("KEEPERHUB_API_KEY is not set (app/.env)");

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "sentinel-raw-call", version: "0.1.0" });
  await client.connect(transport);

  try {
    const args: Record<string, unknown> = {
      contract_address: contractAddress,
      chain_id: CHAIN_ID,
      function_name: functionName,
      function_args: functionArgsJson ?? "[]",
    };
    if (value) args.value = value;

    console.log("[raw-call] Calling:", args);
    const result = await client.callTool({ name: "execute_contract_call", arguments: args });
    console.log("[raw-call] Result:", JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
