import Link from "next/link";
import { RunConsole } from "./_components/run-console";

// 배경은 globals.css의 html/body가 칠한다. 여기서 또 칠하면 두 검정이 겹쳐 경계선이 생긴다.
export default function Home() {
  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-xl font-semibold text-zinc-50">Onchain Sentinel</h1>
            <Link href="/flare" className="font-mono text-xs text-zinc-500 underline decoration-zinc-700 hover:text-zinc-300 hover:decoration-emerald-500">
              Flare version →
            </Link>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Give it a wallet address. The agent reads the position onchain, designs the watch, diagnoses
            the risk, and defends it through KeeperHub.
          </p>
        </header>
        <RunConsole />
      </main>
    </div>
  );
}
