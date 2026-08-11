import { RunConsole } from "./_components/run-console";

export default function Home() {
  return (
    <div className="min-h-full bg-white dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Sentinel</h1>
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
