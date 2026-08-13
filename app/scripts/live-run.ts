// Pre-demo dry run: runs the exact production pipeline (stepAnalyze -> stepDiagnose ->
// stepExecute -> stepVerify) against the executor wallet's real Aave position on Base,
// to confirm the full loop works before recording the demo video.
//
// 사용법: npm run demo:live-run

import { stepAnalyze, stepDiagnose, stepExecute, stepVerify } from "../app/_actions/run-steps";

const EXECUTOR = "0x2b33afb068a77b103fFAF0b7d9F128209076BcE3";
const BASE_WETH = "0x4200000000000000000000000000000000000006";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  console.log("[1] Reading position onchain...");
  const analyze = await stepAnalyze(EXECUTOR);
  if (!analyze.ok) throw new Error(`stepAnalyze failed: ${analyze.error}`);
  console.log(analyze.data.snapshot);

  console.log("\n[2] Agent reads it and decides...");
  const diagnose = await stepDiagnose(analyze.data.profile, analyze.data.snapshot);
  if (!diagnose.ok) throw new Error(`stepDiagnose failed: ${diagnose.error}`);
  console.log("Verdict:", diagnose.data.verdict);

  const { action } = diagnose.data.verdict;
  if (action === "NO_ACTION" || action === "INCREASE_MONITORING") {
    console.log(`\nAgent chose ${action} — nothing to execute onchain. Stopping here.`);
    return;
  }

  const asset = action === "SUPPLY_COLLATERAL" || action === "WITHDRAW_COLLATERAL" ? BASE_WETH : BASE_USDC;
  // Half of the debt, as planned (architecture.md §8-2).
  const debtBase = BigInt(analyze.data.snapshot.totalDebtBase);
  const amount = (debtBase / BigInt(2)).toString();

  console.log(`\n[3] Executing ${action} (asset=${asset}, amount=${amount})...`);
  const exec = await stepExecute(action, { asset, amount });
  if (!exec.ok) throw new Error(`stepExecute failed: ${exec.error}`);
  console.log(exec.data);

  console.log("\n[4] Re-reading position to confirm it actually moved...");
  const verify = await stepVerify(EXECUTOR);
  if (!verify.ok) throw new Error(`stepVerify failed: ${verify.error}`);
  console.log(verify.data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
