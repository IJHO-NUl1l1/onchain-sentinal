import { network } from "hardhat";

// XRP/USD feed id, from dev.flare.network/ftso/feeds. Sanity-check it resolves on Coston2
// through the same ContractRegistry.getTestFtsoV2() path SentinelVault.sol already uses,
// before pointing a policy at it for the Interoperable Asset Products angle.
const XRP_USD_FEED_ID = "0x015852502f55534400000000000000000000000000";

async function main() {
  const { ethers } = await network.create({ network: "coston2", chainType: "l1" });
  const [signer] = await ethers.getSigners();
  const FeedCheck = await ethers.getContractFactory("FeedCheck", signer);
  const feedCheck = await FeedCheck.deploy();
  await feedCheck.waitForDeployment();
  console.log("FeedCheck deployed:", await feedCheck.getAddress());

  const [value, decimals, timestamp] = await feedCheck.read(XRP_USD_FEED_ID);
  console.log("XRP/USD value:", value.toString(), "decimals:", decimals, "timestamp:", timestamp.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
