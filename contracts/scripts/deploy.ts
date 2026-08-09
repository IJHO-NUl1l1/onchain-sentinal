import { network } from "hardhat";

// agent = FlareExecutor가 agentRespond()를 호출할 때 쓰는 서명 주소.
// 지금은 배포자 지갑을 그대로 agent로 씀 — 전용 지갑 분리는 후속.
async function main() {
  const { ethers } = await network.create({ network: "coston2", chainType: "l1" });
  const [deployer] = await ethers.getSigners();

  console.log("Deploying SentinelVault, agent =", deployer.address);

  const SentinelVault = await ethers.getContractFactory("SentinelVault");
  const vault = await SentinelVault.deploy(deployer.address);
  await vault.waitForDeployment();

  console.log("SentinelVault deployed to:", await vault.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
