"use client";

import { useState, useTransition } from "react";
import { registerWallet } from "../_actions/register-wallet";

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
    </svg>
  );
}

export function GuardPanel() {
  const [address, setAddress] = useState("");
  const [watched, setWatched] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await registerWallet(trimmed);
        setWatched(trimmed);
      } catch (err) {
        setWatched(null);
        setError(err instanceof Error ? err.message : "등록 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
            watched
              ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-600 dark:text-emerald-500"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600"
          }`}
        >
          <ShieldIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {isPending ? "등록 중…" : watched ? "감시 중" : "미등록"}
            </span>
            {watched && !isPending && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </div>
          {watched ? (
            <p className="mt-0.5 truncate font-mono text-sm text-zinc-500 dark:text-zinc-400">
              {watched}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              지갑 주소를 등록하면 감시망을 설계해 배치합니다.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          spellCheck={false}
          disabled={isPending}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-emerald-600/60 dark:focus:border-emerald-500/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-50 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
        >
          {isPending ? "등록 중…" : watched ? "변경" : "감시 시작"}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-500">{error}</p>
      )}
    </section>
  );
}
