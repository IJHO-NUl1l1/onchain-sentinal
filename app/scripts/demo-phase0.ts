// Phase 0 데모용 러너: 지갑 분석 → 워크플로우 자동 생성.
// docs/todo.md Phase C "Phase 0 데모" 참조. 촬영/리허설용으로 매번 같은 흐름을
// 반복 실행할 수 있게 스크립트로 뺐다.
//
// 사용법: npm run demo:phase0 -- <walletAddress>

import { analyzeWallet } from "../agent/analyzer";
import { KeeperHubExecutor } from "../executors/keeperhub";

async function main() {
  const address = process.argv[2];
  if (!address) {
    console.error("사용법: npm run demo:phase0 -- <walletAddress>");
    process.exit(1);
  }

  console.log(`[analyzer] 지갑 분석 중: ${address}`);
  const profile = await analyzeWallet(address);
  console.log("[analyzer] 리스크 프로파일:", profile);

  console.log("[executor] KeeperHub에 감시망 배치 중...");
  const executor = new KeeperHubExecutor();
  await executor.provisionMonitoring(profile);
  console.log("[executor] 완료 — KeeperHub 대시보드에서 워크플로우 확인 가능");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
