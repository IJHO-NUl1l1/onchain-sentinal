import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

// ⚠️ EVM 버전은 반드시 cancun. 안 맞추면 Coston2 배포가 실패한다.
const COSTON2_RPC_URL = process.env.COSTON2_RPC_URL ?? "https://coston2-api.flare.network/ext/C/rpc";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.25",
        settings: {
          evmVersion: "cancun",
        },
      },
      production: {
        version: "0.8.25",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    coston2: {
      type: "http",
      chainType: "l1",
      url: COSTON2_RPC_URL,
      chainId: 114,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
});
