# Onchain Sentinel — Flare

**Give it a wallet address. It reads a real onchain price, designs a watch for that specific
position, diagnoses ambiguous risk with an LLM, and defends real deposited funds through a smart
contract we deployed ourselves — not a template, not a company's infrastructure, our own code.**

Agents can think. This is the Flare-native proof that the judgment/execution boundary this project
is built on doesn't need a third-party executor at all — it can live entirely onchain, with the
LLM only consulted for the cases a contract genuinely can't resolve on its own.

**Who this is for:** anyone holding a position denominated in an interoperable asset (XRP today,
FXRP once FAssets minting is live) who wants it watched and defended without staring at a price
chart — and, more broadly, builders who want a pattern for onchain guardians that don't call an
LLM for every check, only the ones that are actually ambiguous.

---

## The bar we held ourselves to

Same two things as the KeeperHub track. Everything else is decoration.

1. **It reads real data from the chain.** Not a fixture — the live price of a real asset (XRP/USD),
   read from Flare's FTSOv2 oracle.
2. **The agent actually diagnoses that data.** Only when the contract itself can't resolve the
   situation on its own — real deviation numbers go to Claude, and its verdict drives what happens
   next.

---

## What it does, in seven steps

| # | Step | What actually runs |
|---|------|--------------------|
| 1 | **Deposit real funds** | `deposit()` on `SentinelVault.sol` — native C2FLR, a real balance the rest of the run protects. |
| 2 | **Deploy the watch** | `setPolicy()` anchors the live FTSOv2 XRP/USD price at that exact moment. |
| 3 | **Contract checks itself** | Permissionless `checkAndExecute()` — the contract alone sorts the case into normal / gray-zone / immediate-defense. |
| 4 | **Agent decides** *(gray zone only)* | Real deviation data goes to Claude; it answers with one of seven predefined actions. Skipped entirely if the contract already resolved it. |
| 5 | **Execute** | `agentRespond()` — only `LOCK_POSITION` changes state today; every choice is still recorded onchain. |
| 6 | **Confirm the state moved** | Re-reads `policies()` — a defense that didn't change `isLocked` didn't happen. |
| 7 | **Test the exit** | `withdraw()` — reverts with `PositionLocked` if locked, succeeds otherwise. The real proof this isn't a flag. |

---

## What's different here: judgment is pre-filtered onchain, not always invoked

The KeeperHub track calls the agent every time. This one doesn't have to — `SentinelVault.sol`
splits every check into three tiers **before** anything reaches an LLM:

| Deviation from anchor | Who decides | What happens |
|---|---|---|
| Below threshold | The contract, alone | Nothing. No agent call. |
| Threshold to 2× threshold (the gray zone) | Claude | Real deviation data goes to the model; it answers with one of seven predefined actions |
| 2× threshold or more | The contract, alone | Locks the position immediately. No agent call — the case is unambiguous. |

This is "judgment is a language model, execution is deterministic infrastructure" taken one step
further: the decision of *whether to even ask the model* is itself deterministic and onchain.

---

## Real custody, not a flag

An earlier version of this contract only ever set a boolean. That's thin for a track called
**Interoperable Asset Products** — a guardian that doesn't hold an asset isn't an asset product.

`SentinelVault.sol` now actually custodies funds:

- `deposit()` — native C2FLR goes into the contract. This is the position being watched.
- `withdraw(amount)` — pulls funds back out. **Reverts with `PositionLocked` if the policy is
  locked.** The lock isn't a record of a decision; it's the thing standing between a user and
  their money.
- `unlock()` — the user can free their own position at any time. Defense doesn't take funds
  hostage — it holds a door shut, and the same key that shuts it can open it.

---

## Proof

**The agent's own judgment call, from a live run in the gray zone.** This is the branch that
actually matters — the case the contract can't resolve on its own, so it hands the real numbers to
Claude and waits for a verdict:

> Deviation was 3 bips against a 3-bip threshold — the very bottom of the gray zone. Claude's
> verdict: `severity: medium`, `action: INCREASE_MONITORING`, reasoning that "a 0.01–0.03% move is
> within ordinary tick noise" and that locking here "would be a clearly premature freeze of the
> only action the vault actually enforces onchain." No state changed — recorded onchain via
> `AgentResponded` only. Run twice independently (thresholds 3 and 1 bips), same conclusion both
> times, each time citing the actual numbers rather than a template answer.

**The other real branch — the contract defending itself, with zero LLM calls.** A full cycle, run
live on Coston2, in order:

| Step | What happened | Transaction |
|---|---|---|
| 1. Deposit | 10 C2FLR into the vault — real value, real balance | [`0x0884e0d9…`](https://coston2-explorer.flare.network/tx/0x0884e0d9bb51fa5df58dc1a2c5ca70f56c918a9b24e99d8f5153679013f54088) |
| 2. Deploy the watch | `setPolicy(XRP/USD, 4 bips)`, anchor `1010763` | [`0x5ba7950c…`](https://coston2-explorer.flare.network/tx/0x5ba7950c4fd03c50f6f70b66f6a4b5497ad22dd5c6c63cc31a11c58383b8b639) |
| 3. Contract defends itself | Real XRP/USD dropped 8 bips — past 2× the threshold. The contract locked the position **with zero LLM calls** | [`0x6ed2cc11…`](https://coston2-explorer.flare.network/tx/0x6ed2cc11439d409d580b0bbcbb37d6df30853cf362bbf7c97c384a224de4985d) |
| 4. Test the exit, locked | `withdraw(10)` — reverts with **`PositionLocked`**. The vault's own words, not ours. | (revert — no tx broadcast; see the raw response in the console) |
| 5. Unlock | The user, not the agent, chooses to release it | [`0xddb6e089…`](https://coston2-explorer.flare.network/tx/0xddb6e0891051d5ef8e9da0b6e39451b68301c7b69c20ac2ce67d99954ec837ab) |
| 6. Test the exit, unlocked | `withdraw(5)` succeeds — same function, same funds, only the lock changed | [`0x4d0102ae…`](https://coston2-explorer.flare.network/tx/0x4d0102aeb52ad45a0e458fb1360f3f3176ae3fd05c63f94364539a4a58fb5815) |

Same contract, same policy design, two different real outcomes depending only on how far the price
actually moved — nothing about which branch fires is scripted per run.

**Contract addresses:**

| | Address |
|---|---|
| SentinelVault v2 (Coston2) | [`0x1288516DcE1642952d1e3eB79504F496edb38D31`](https://coston2-explorer.flare.network/address/0x1288516DcE1642952d1e3eB79504F496edb38D31) |
| FTSOv2 feed watched | XRP/USD — `0x015852502f55534400000000000000000000000000` |

---

## Flare surfaces used

**FTSOv2** — `ContractRegistry.getTestFtsoV2().getFeedById(feedId)`, Coston2's gas-free view path
(production would use the payable `getFtsoV2()`). Verified independently with a throwaway reader
contract (`contracts/contracts/FeedCheck.sol`) before wiring it into the vault — not copied from
docs, read from the chain.

**Why XRP/USD** — Flare's own framing is unlocking DeFi for assets without native smart contracts,
starting with XRP through FAssets. XRP/USD is a real, `🟢 Low Risk`-rated feed on Flare's official
list. There's no dedicated FXRP feed today, so this is the closest real, live proxy for "an
interoperable asset's price" available right now — the same contract watches it with zero code
changes from watching FLR/USD.

---

## Why the demo threshold looks aggressive

A production deployment would set the drop threshold around 500 bips (5%) — the size of a move
that actually threatens a position. We run this demo at a few bips instead, disclosed onscreen in
the console: nothing about the contract, the tiers, or the agent changes: only how sensitive the
policy is configured to be, which is a parameter a real user sets for their own risk tolerance
anyway.

---

## Architecture

```
        real FTSOv2 price
              │
   ┌──────────▼───────────┐
   │  Dashboard (Next.js) │   /flare console — every step exposed
   └──────────┬───────────┘
              │
   ┌──────────▼────────────────────┐
   │  Agent                        │
   │   prompt   → assembles + validates (flare-diagnoser.md / flare-strategist.md)
   │   claude   → the judgment call, only in the gray zone
   └──────────┬────────────────────┘
              │  Executor interface — same one KeeperHubExecutor implements
              ▼
       FlareExecutor
   (viem, Coston2, SentinelVault.sol)
```

`app/agent/prompt.ts`'s `buildFlareAgentPrompt()` sits next to `buildAgentPrompt()` in the same
file; `parseVerdict()` is the exact same function both tracks call. One brain, two executors — this
is the code-level evidence, not a claim.

```
app/agent/       flare-diagnoser.md / flare-strategist.md, buildFlareAgentPrompt()
app/executors/   flare.ts — checkPolicy, setPolicyFor, depositToVault, tryWithdraw, readPolicy
app/app/flare/   the Flare console route
contracts/       SentinelVault.sol — deposit/withdraw/lock, deployed on Coston2
```

---

## What is honest about this build

**Only `LOCK_POSITION` moves contract state today.** The agent can pick any of the seven actions,
and every choice is recorded onchain via `AgentResponded` — but `SUPPLY_COLLATERAL`,
`WITHDRAW_COLLATERAL`, and `REPAY_DEBT` don't move funds on this contract yet (there's nothing to
supply or repay against — this vault protects a single deposited balance, not a lending position).
The prompt itself says so, so the model doesn't imply a capability that isn't there.

**The policy is always owned by the signer.** `setPolicy()` has no on-behalf-of parameter, so the
watched position is always the executor's own deposit — the same constraint the KeeperHub track has
with its Turnkey wallet, for the same reason: whoever can sign is whoever the defense can act for.

**This is Coston2, a testnet.** C2FLR has no market value. What's real is the mechanism: a genuine
deposit, a genuine FTSO price, a genuine model call, and a genuine revert when the exit is locked —
none of it simulated. Moving this to Flare mainnet is a network config change, not a rewrite.

---

## What existed before this program vs. what's new on Flare

Onchain Sentinel started as a KeeperHub-track submission: a wallet address goes in, an LLM reads
its real Aave v3 position and defends it through KeeperHub's execution infrastructure. That's where
the shared "brain" — `analyzer` → `prompt` → `claude`, and the `Executor` interface it talks
through — was built, before any Flare-specific work started.

**Built new, for Flare, during this program:**
- `SentinelVault.sol` itself — the three-tier judgment contract (normal / gray-zone / immediate-
  defense), deployed and iterated on Coston2
- `FlareExecutor` — the second real implementation of the same `Executor` interface KeeperHub uses,
  proving the boundary is a property of the code, not a claim about one integration
- Real asset custody (`deposit` / `withdraw` / the `PositionLocked` revert) — added after the first
  version only ever set a flag, specifically because a track called *Interoperable Asset Products*
  should touch an asset
- `flare-diagnoser.md` / `flare-strategist.md` and `buildFlareAgentPrompt()` — the FTSO-specific
  half of the prompt layer, sitting next to the KeeperHub one but reasoning about price deviation
  instead of a lending position
- The `/flare` console — its own five-through-seven-act UI, not a reskin of the KeeperHub one
- The XRP/USD integration itself — verified against Flare's own FTSOv2 feed list before wiring it
  in, not assumed

**Ported/reused unchanged:** `parseVerdict()` and the seven-action enum are the literal same
function and the same TypeScript union the KeeperHub track validates against — nothing was
duplicated to make the Flare track work.

**Why the new work matters:** it's the difference between "we called an LLM once" and "judgment and
execution are separated as a general pattern, portable across chains and executors." The Flare
track is what makes that a claim about the architecture rather than about one integration.

---

## Roadmap

- **FAssets integration once minting is live** — the vault already watches any FTSOv2 feed with no
  code change; pointing it at an actual FXRP price (once one exists) instead of plain XRP/USD is a
  configuration change, not new code.
- **Fund `SUPPLY_COLLATERAL` / `WITHDRAW_COLLATERAL` / `REPAY_DEBT` with real logic** — today they're
  recorded recommendations only; the natural next step is a lending-style position (deposit +
  borrow, mirroring the KeeperHub track's Aave shape) so those three actions have something to act on.
- **A permissionless keeper bot** for `checkAndExecute()` — right now our own scripts call it;
  the function is designed to be called by anyone, and a public keeper is what makes the watch
  actually unattended.
- **Flare mainnet** — the only blocker is swapping the network config; `getFtsoV2()` replaces the
  free `getTestFtsoV2()` used here for development.

---

## Run it

Same repo, same `.env` as the KeeperHub track, plus:

```
DEPLOYER_PRIVATE_KEY=...   # Coston2 wallet, funded with C2FLR from the faucet
COSTON2_RPC_URL=...
```

```bash
npm run dev --prefix app
# → http://localhost:3000/flare
```

Headless:

```bash
npm run demo:flare-watch --prefix app   # watches real deviation for free, commits when it's in band
```
