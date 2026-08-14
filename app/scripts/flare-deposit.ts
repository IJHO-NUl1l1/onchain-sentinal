import { depositToVault } from "../executors/flare";

const amountEther = process.argv[2] ?? "10";
const wei = BigInt(Math.floor(Number(amountEther) * 1e18));

depositToVault(wei).then((r) => console.log(r));
