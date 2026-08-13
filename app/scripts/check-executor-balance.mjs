import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({ chain: base, transport: http() });
const EXECUTOR = "0x2b33afb068a77b103fFAF0b7d9F128209076BcE3";
const WETH = "0x4200000000000000000000000000000000000006";

const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
];

const nativeBal = await client.getBalance({ address: EXECUTOR });
const wethBal = await client.readContract({ address: WETH, abi: erc20Abi, functionName: "balanceOf", args: [EXECUTOR] });

console.log("Native ETH:", formatEther(nativeBal));
console.log("WETH:", formatEther(wethBal));
