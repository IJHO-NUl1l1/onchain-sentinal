import { network } from "hardhat";

// Flare 데모 러너: setPolicy → checkAndExecute를 실제 Coston2에서 실행.
//
// ⚠️ FLR/USD는 매 블록(~1.8초) 갱신돼서, 견적 시점과 채굴 시점 사이에 가격이 바뀌면
// 더 비싼 코드 경로를 타 자동 gas estimate가 빗나간다(out-of-gas). 항상 명시적 gasLimit을 준다.

const FLR_USD_FEED_ID = "0x01464c522f55534400000000000000000000000000"; // "FLR/USD", 21 bytes
const VAULT_ADDRESS = "0x1288516DcE1642952d1e3eB79504F496edb38D31";
const CHECK_GAS_LIMIT = 300_000n;

async function main() {
  const { ethers } = await network.create({ network: "coston2", chainType: "l1" });
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("SentinelVault", VAULT_ADDRESS, signer);

  console.log("[setPolicy] FLR/USD, threshold=500bips(5%)");
  const tx1 = await vault.setPolicy(FLR_USD_FEED_ID, 500n, { gasLimit: CHECK_GAS_LIMIT });
  await tx1.wait();
  const policy = await vault.policies(signer.address);
  console.log("[setPolicy] Done — anchored to a live FTSO price: anchorPrice =", policy[1].toString());

  console.log("[checkAndExecute] Executing");
  const tx2 = await vault.checkAndExecute(signer.address, { gasLimit: CHECK_GAS_LIMIT });
  const receipt = await tx2.wait();
  console.log("[checkAndExecute] status:", receipt?.status, "tx:", receipt?.hash);

  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed) console.log("[event]", parsed.name, parsed.args);
    } catch {
      // 이 컨트랙트가 낸 이벤트가 아님 (FTSO 시스템 컨트랙트 내부 로그 등)
    }
  }

  const policyAfter = await vault.policies(signer.address);
  console.log("[result] isLocked:", policyAfter[3]);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
