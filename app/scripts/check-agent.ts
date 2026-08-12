// 에이전트 호출이 실제로 도는지 확인하는 점검 스크립트. 온체인 조회 없이
// 가짜 스냅샷으로 prompt 조립 → Claude 호출 → parseVerdict 까지만 태운다.
// (tsx가 cjs로 트랜스파일해서 top-level await은 못 쓴다 — main()으로 감싼다)
import { buildAgentPrompt, parseVerdict } from "../agent/prompt";
import { askAgent } from "../agent/claude";

const profile = {
  walletAddress: "0x2b33afb068a77b103fFAF0b7d9F128209076BcE3",
  assets: ["WETH", "USDC"],
};

// 건강도 1.06 — 청산 임계(83%) 코앞. 에이전트가 위험을 알아채야 하는 상태.
const snapshot = {
  totalCollateralBase: "100000000",
  totalDebtBase: "78000000",
  collateralUsd: "1.00",
  debtUsd: "0.78",
  healthFactor: "1.0641",
  ltvPercent: "80.00",
  liquidationThresholdPercent: "83.00",
};

async function main() {
  const prompt = buildAgentPrompt(profile, JSON.stringify(snapshot, null, 2));
  console.log(`Prompt assembled: ${prompt.length} chars`);

  const started = Date.now();
  const raw = await askAgent(prompt);
  console.log(`Model responded in ${Date.now() - started}ms`);
  console.log("--- raw response ---");
  console.log(raw);

  console.log("--- after parseVerdict ---");
  console.log(JSON.stringify(parseVerdict(raw), null, 2));
}

main();
