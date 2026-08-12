// 지갑 분석 → 워크플로우 자동 생성 러너 (촬영·리허설용).
//
// 사용법: npm run demo:phase0 -- <walletAddress>

import { analyzeWallet } from "../agent/analyzer";
import { KeeperHubExecutor } from "../executors/keeperhub";

async function main() {
  const address = process.argv[2];
  if (!address) {
    console.error("Usage: npm run demo:phase0 -- <walletAddress>");
    process.exit(1);
  }

  console.log(`[analyzer] Analyzing wallet: ${address}`);
  const profile = await analyzeWallet(address);
  console.log("[analyzer] Risk profile:", profile);

  console.log("[executor] Deploying the watch to KeeperHub...");
  const executor = new KeeperHubExecutor();
  await executor.provisionMonitoring(profile);
  console.log("[executor] Done — the workflow is now visible in the KeeperHub dashboard");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
