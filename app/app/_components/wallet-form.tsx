"use client";

import { useState } from "react";

export function WalletForm() {
  const [address, setAddress] = useState("");
  const [watched, setWatched] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    // UI 골격 단계 — 실제 등록(analyzer 호출 등)은 Agent 로직 붙인 뒤 연결.
    setWatched(address.trim());
  }

  return (
    <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
        지갑 등록
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          spellCheck={false}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-zinc-500 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-50 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          감시 시작
        </button>
      </form>

      {watched && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          감시 대상:{" "}
          <span className="font-mono text-zinc-900 dark:text-zinc-100">
            {watched}
          </span>
        </p>
      )}
    </section>
  );
}
