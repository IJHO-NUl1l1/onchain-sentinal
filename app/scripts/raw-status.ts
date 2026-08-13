// get_direct_execution_status via the org API key. Companion to raw-contract-call.ts —
// the OAuth MCP session used interactively belongs to a different KeeperHub org than
// KEEPERHUB_API_KEY, so it 401s on executions created via the org key. Check status here instead.
//
// 사용법: npm run demo:raw-status -- <executionId>

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://app.keeperhub.com/mcp";

async function main() {
  const executionId = process.argv[2];
  if (!executionId) {
    console.error("Usage: npm run demo:raw-status -- <executionId>");
    process.exit(1);
  }

  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) throw new Error("KEEPERHUB_API_KEY is not set (app/.env)");

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "sentinel-raw-status", version: "0.1.0" });
  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "get_direct_execution_status",
      arguments: { execution_id: executionId },
    });
    console.log("[raw-status] Result:", JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
