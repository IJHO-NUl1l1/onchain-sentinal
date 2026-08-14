import { FlareConsole } from "../_components/flare-console";

export const metadata = {
  title: "Onchain Sentinel — Flare",
  description: "An agent that watches a real FTSOv2 price and defends a deposited position through a Flare smart contract we deployed.",
};

export default function FlarePage() {
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-50">Onchain Sentinel — Flare</h1>
          <p className="mt-1 text-sm text-zinc-500">
            A smart contract we deployed — SentinelVault.sol on Flare — holds a deposited position,
            watches a real FTSOv2 price, and signs for itself. Obvious cases are resolved by the
            contract alone; only the gray zone reaches the agent.
          </p>
        </header>
        <FlareConsole />
      </main>
    </div>
  );
}
