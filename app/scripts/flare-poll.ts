// Polls checkPolicy on the existing policy (does NOT re-call setPolicy, which would reset the
// anchor) until the contract self-resolves or escalates, then runs the same Claude + execute
// path as flare-live-run.ts.
//
// 사용법: node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/flare-poll.ts

import { checkPolicy, FlareExecutor } from "../executors/flare";
import { buildFlareAgentPrompt, parseVerdict } from "../agent/prompt";
import { askAgent } from "../agent/claude";

const EXECUTOR = "0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c";
const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 20_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let result = await checkPolicy(EXECUTOR);
  let attempts = 0;
  while (result.tier === "normal" && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`tier=normal (attempt ${attempts}/${MAX_ATTEMPTS}), waiting ${INTERVAL_MS / 1000}s...`);
    await sleep(INTERVAL_MS);
    result = await checkPolicy(EXECUTOR);
  }
  console.log("Result:", result);

  if (result.tier === "normal") {
    console.log("\nStill normal after all attempts — try again later, or lower the threshold with a new setPolicy call.");
    return;
  }

  if (result.tier !== "escalation") {
    console.log(`\nContract self-resolved at tier=${result.tier} — no agent judgment needed.`);
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
