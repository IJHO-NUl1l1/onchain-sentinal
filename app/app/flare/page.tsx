import Link from "next/link";
import { FlareConsole } from "../_components/flare-console";

export const metadata = {
  title: "Onchain Sentinel — Flare",
  description: "The same agent, defending a real FTSOv2-priced position through a Flare smart contract instead of KeeperHub.",
};

export default function FlarePage() {
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-xl font-semibold text-zinc-50">Onchain Sentinel — Flare</h1>
            <Link href="/" className="font-mono text-xs text-zinc-500 underline decoration-zinc-700 hover:text-zinc-300 hover:decoration-emerald-500">
              ← KeeperHub version
            </Link>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Same brain, different executor. Instead of KeeperHub signing a transaction on another
            company&apos;s infrastructure, a smart contract we deployed — SentinelVault.sol on
            Flare — signs for itself. Obvious cases are resolved by the contract alone; only the
            gray zone reaches the agent.
          </p>
        </header>
        <FlareConsole />
      </main>
    </div>
  );
}
