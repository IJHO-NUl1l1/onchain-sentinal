// Flare / Interoperable Asset Products dry run: points SentinelVault at the real XRP/USD FTSO
// feed (the asset FAssets bridges onto Flare), then drives the full loop live — setPolicy,
// checkAndExecute, and if the contract escalates instead of self-resolving, a real Claude call
// reasoning from the real deviation, followed by a real agentRespond if it picks LOCK_POSITION.
//
// 사용법: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/flare-live-run.ts

import { setPolicyFor, checkPolicy, FlareExecutor } from "../executors/flare";
import { buildFlareAgentPrompt, parseVerdict } from "../agent/prompt";
import { askAgent } from "../agent/claude";

const XRP_USD_FEED_ID = "0x015852502f55534400000000000000000000000000";
// Tight on purpose — real short-term XRP volatility should cross this within a few polls.
const THRESHOLD_BIPS = BigInt(5);
// setPolicy stores against msg.sender — the DEPLOYER_PRIVATE_KEY address, not KeeperHub's
// Turnkey wallet (Flare has no on-behalf-of param, unlike Aave).
const EXECUTOR = "0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("[1] setPolicy on XRP/USD...");
  const policyResult = await setPolicyFor(XRP_USD_FEED_ID, THRESHOLD_BIPS);
  console.log(policyResult);

  let result = await checkPolicy(EXECUTOR);
  let attempts = 0;
  while (result.tier === "normal" && attempts < 8) {
    attempts++;
    console.log(`[2] tier=normal (attempt ${attempts}), waiting 20s for the price to move...`);
    await sleep(20_000);
    result = await checkPolicy(EXECUTOR);
  }
  console.log("[2] checkAndExecute result:", result);

  if (result.tier !== "escalation") {
    console.log(`\nStopped at tier=${result.tier} — no agent judgment needed for this run.`);
    return;
  }

  console.log("\n[3] Escalated — asking Claude...");
  const prompt = buildFlareAgentPrompt(
    { feedId: result.policy.feedId, thresholdBips: result.policy.thresholdBips, anchorPrice: result.policy.anchorPrice },
    JSON.stringify({ currentPrice: result.currentPrice, deviationBips: result.deviationBips }, null, 2),
  );
  const raw = await askAgent(prompt);
  const parsed = parseVerdict(raw);
  if (!parsed.ok) throw new Error(`Agent verdict rejected: ${parsed.error}`);
  console.log("Verdict:", parsed.verdict);

  console.log("\n[4] Executing the agent's decision...");
  const executor = new FlareExecutor();
  const exec = await executor.execute({ type: parsed.verdict.action, params: { user: EXECUTOR } });
  console.log(exec);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
