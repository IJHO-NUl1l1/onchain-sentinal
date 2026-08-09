import { WalletForm } from "./_components/wallet-form";
import { LogTable } from "./_components/log-table";

export default function Home() {
  return (
    <div className="min-h-full bg-white dark:bg-black">
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <header className="mb-10">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sentinel
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            지갑 주소를 등록하면 감시망을 설계해 배치합니다.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <WalletForm />
          <LogTable />
        </div>
      </main>
    </div>
  );
}
