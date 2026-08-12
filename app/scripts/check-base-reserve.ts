// 검증 스크립트: Base Aave v3 리저브 설정(LTV·청산임계값 등)을 온체인에서 직접 읽는다.
// 비트 레이아웃은 architecture.md §3 ReserveConfigurationMap 표 참조.
//
// 사용법: node node_modules/tsx/dist/cli.mjs scripts/check-base-reserve.ts

import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";

const POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;

const poolAbi = [
  {
    type: "function",
    name: "getReservesList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getConfiguration",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256", name: "data" }],
  },
] as const;

const client = createPublicClient({ chain: base, transport: http() });

// 비트 구간 추출 헬퍼 (하위 lo비트부터 hi비트까지, 양끝 포함)
function bits(v: bigint, lo: number, hi: number): bigint {
  const width = BigInt(hi - lo + 1);
  const one = BigInt(1);
  return (v >> BigInt(lo)) & ((one << width) - one);
}

// 공용 RPC가 연속 호출에 레이트 리밋을 건다 — 순차 호출 + 백오프 재시도.
async function retry<T>(label: string, fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === tries - 1) throw new Error(`${label} failed: ${(err as Error).message.split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  // 인자로 주소를 주면 그것만, 없으면 getReservesList에서 고른 후보를 본다.
  const target = process.argv[2];
  const reserves = await retry("getReservesList", () =>
    client.readContract({ address: POOL, abi: poolAbi, functionName: "getReservesList" }),
  );

  console.log(`Base Aave v3 Pool ${POOL}`);
  console.log(`reserves: ${reserves.length}`);

  const assets = target ? [target as `0x${string}`] : reserves;
  for (const asset of assets) {
    if (target && !reserves.includes(asset)) {
      console.log(`⚠️ ${asset} 는 이 Pool의 리저브 목록에 없다 — 주소가 틀렸다`);
      continue;
    }
    const symbol = await retry(`symbol(${asset})`, () =>
      client.readContract({ address: asset, abi: erc20Abi, functionName: "symbol" }),
    );
    const decimals = await retry(`decimals(${asset})`, () =>
      client.readContract({ address: asset, abi: erc20Abi, functionName: "decimals" }),
    );
    if (!target && !/USD/i.test(symbol)) continue;

    const cfg = await retry(`getConfiguration(${asset})`, () =>
      client.readContract({
        address: POOL,
        abi: poolAbi,
        functionName: "getConfiguration",
        args: [asset],
      }),
    );

    console.log("\n=== " + symbol + " ===");
    console.log("address           :", asset);
    console.log("decimals (erc20)  :", decimals);
    console.log("decimals (cfg)    :", bits(cfg, 48, 55).toString());
    console.log("LTV               :", Number(bits(cfg, 0, 15)) / 100, "%");
    console.log("liq. threshold    :", Number(bits(cfg, 16, 31)) / 100, "%");
    console.log("liq. bonus        :", Number(bits(cfg, 32, 47)) / 100, "%");
    console.log("active            :", bits(cfg, 56, 56) === BigInt(1));
    console.log("frozen            :", bits(cfg, 57, 57) === BigInt(1));
    console.log("borrowing enabled :", bits(cfg, 58, 58) === BigInt(1));
    console.log("paused            :", bits(cfg, 60, 60) === BigInt(1));
    console.log("borrowable in iso :", bits(cfg, 61, 61) === BigInt(1));
    console.log("siloed borrowing  :", bits(cfg, 62, 62) === BigInt(1));
    console.log("borrow cap        :", bits(cfg, 80, 115).toString());
    console.log("supply cap        :", bits(cfg, 116, 151).toString());
    console.log("debt ceiling(iso) :", bits(cfg, 212, 251).toString());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
