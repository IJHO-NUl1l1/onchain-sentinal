// Watches real XRP/USD deviation off-chain (free view calls, no tx) until it's genuinely
// inside the policy's threshold band, then fires the one real checkAndExecute tx that
// actually matters. Replaces blind polling (flare-poll.ts), which spent a real tx on every
// "still normal" read. The data is never invented — this only chooses *when* to commit.
//
// 사용법: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/flare-watch.ts

import { createPublicClient, http } from "viem";
import { flareTestnet } from "viem/chains";
import { readPolicy, checkPolicy, FlareExecutor } from "../executors/flare";
import { buildFlareAgentPrompt, parseVerdict } from "../agent/prompt";
import { askAgent } from "../agent/claude";

const EXECUTOR = "0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c";
const FEED_CHECK = "0x93D3cC7C2F340E7eeB5957dd7859b57fbd6cc75c";
const POLL_MS = 4_000;
const MAX_MINUTES = 15;

const feedCheckAbi = [
  {
    type: "function",
    name: "read",
    stateMutability: "view",
    inputs: [{ name: "feedId", type: "bytes21" }],
    outputs: [
      { name: "value", type: "uint256" },
      { name: "decimals", type: "int8" },
      { name: "timestamp", type: "uint64" },
    ],
  },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const policy = await readPolicy(EXECUTOR);
  if (!policy.thresholdBips || policy.thresholdBips === "0") {
    throw new Error("No active policy on this address — run setPolicyFor first.");
  }
  const anchor = BigInt(policy.anchorPrice);
  const threshold = BigInt(policy.thresholdBips);
  console.log(`Watching feed ${policy.feedId}, anchor=${anchor}, threshold=${threshold}bips`);

  const client = createPublicClient({ chain: flareTestnet, transport: http() });
  const deadline = Date.now() + MAX_MINUTES * 60_000;

  while (Date.now() < deadline) {
    const [current] = await client.readContract({
      address: FEED_CHECK,
      abi: feedCheckAbi,
      functionName: "read",
      args: [policy.feedId as `0x${string}`],
    });

    const dropped = current < anchor;
    const deviationBips = dropped ? ((anchor - current) * BigInt(10000)) / anchor : BigInt(0);
    console.log(`price=${current} anchor=${anchor} dropped=${dropped} deviationBips=${deviationBips}`);

    if (dropped && deviationBips >= threshold) {
      console.log(`\nDeviation ${deviationBips}bips >= threshold ${threshold}bips — firing checkAndExecute now.`);
      break;
    }
    await sleep(POLL_MS);
  }

  console.log("\nCalling checkAndExecute...");
  const result = await checkPolicy(EXECUTOR);
  console.log("Result:", result);

  if (result.tier !== "escalation") {
    console.log(`\nLanded at tier=${result.tier} — no agent judgment needed for this run.`);
    return;
  }

  console.log("\nEscalated — asking Claude...");
  const prompt = buildFlareAgentPrompt(
    { feedId: result.policy.feedId, thresholdBips: result.policy.thresholdBips, anchorPrice: result.policy.anchorPrice },
    JSON.stringify({ currentPrice: result.currentPrice, deviationBips: result.deviationBips }, null, 2),
  );
  const raw = await askAgent(prompt);
  const parsed = parseVerdict(raw);
  if (!parsed.ok) throw new Error(`Agent verdict rejected: ${parsed.error}`);
  console.log("Verdict:", parsed.verdict);

  console.log("\nExecuting the agent's decision...");
  const executor = new FlareExecutor();
  const exec = await executor.execute({ type: parsed.verdict.action, params: { user: EXECUTOR } });
  console.log(exec);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
