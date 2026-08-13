// execute_protocol_action runner via the org API key, for actions with no slot in our
// ActionType enum yet (aave-v3/borrow). Companion to raw-contract-call.ts.
//
// 사용법: npm run demo:raw-action -- <actionType> '<paramsJson>'

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://app.keeperhub.com/mcp";

async function main() {
  const [actionType, paramsJson] = process.argv.slice(2);
  if (!actionType) {
    console.error(`Usage: npm run demo:raw-action -- <actionType> '<paramsJson>'`);
    process.exit(1);
  }

  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) throw new Error("KEEPERHUB_API_KEY is not set (app/.env)");

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });
  const client = new Client({ name: "sentinel-raw-action", version: "0.1.0" });
  await client.connect(transport);

  try {
    const params = paramsJson ? JSON.parse(paramsJson) : {};
    console.log("[raw-action] Calling:", actionType, params);
    const result = await client.callTool({ name: "execute_protocol_action", arguments: { actionType, params } });
    console.log("[raw-action] Result:", JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
