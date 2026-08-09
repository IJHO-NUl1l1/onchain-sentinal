import { GuardPanel } from "./_components/guard-panel";
import { LogTable } from "./_components/log-table";

export default function Home() {
  return (
    <div className="min-h-full bg-white dark:bg-black">
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sentinel
          </h1>
        </header>

        <div className="flex flex-col gap-6">
          <GuardPanel />
          <LogTable />
        </div>
      </main>
    </div>
  );
}
