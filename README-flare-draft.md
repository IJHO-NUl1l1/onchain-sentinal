# Onchain Sentinel — Flare

**Give it a wallet address. It reads a real onchain price, designs a watch for that specific
position, diagnoses ambiguous risk with an LLM, and defends real deposited funds through a smart
contract we deployed ourselves — not a template, not a company's infrastructure, our own code.**

Agents can think. This is the Flare-native proof that the judgment/execution boundary this project
is built on doesn't need a third-party executor at all — it can live entirely onchain, with the
LLM only consulted for the cases a contract genuinely can't resolve on its own.

---

## The bar we held ourselves to

Same two things as the KeeperHub track. Everything else is decoration.

1. **It reads real data from the chain.** Not a fixture — the live price of a real asset (XRP/USD),
   read from Flare's FTSOv2 oracle.
2. **The agent actually diagnoses that data.** Only when the contract itself can't resolve the
   situation on its own — real deviation numbers go to Claude, and its verdict drives what happens
   next.

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

A full cycle, run live on Coston2, in order:

| Step | What happened | Transaction |
|---|---|---|
| 1. Deposit | 10 C2FLR into the vault — real value, real balance | [`0x0884e0d9…`](https://coston2-explorer.flare.network/tx/0x0884e0d9bb51fa5df58dc1a2c5ca70f56c918a9b24e99d8f5153679013f54088) |
| 2. Deploy the watch | `setPolicy(XRP/USD, 4 bips)`, anchor `1010763` | [`0x5ba7950c…`](https://coston2-explorer.flare.network/tx/0x5ba7950c4fd03c50f6f70b66f6a4b5497ad22dd5c6c63cc31a11c58383b8b639) |
| 3. Contract defends itself | Real XRP/USD dropped 8 bips — past 2× the threshold. The contract locked the position **with zero LLM calls** | [`0x6ed2cc11…`](https://coston2-explorer.flare.network/tx/0x6ed2cc11439d409d580b0bbcbb37d6df30853cf362bbf7c97c384a224de4985d) |
| 4. Test the exit, locked | `withdraw(10)` — reverts with **`PositionLocked`**. The vault's own words, not ours. | (revert — no tx broadcast; see the raw response in the console) |
| 5. Unlock | The user, not the agent, chooses to release it | [`0xddb6e089…`](https://coston2-explorer.flare.network/tx/0xddb6e0891051d5ef8e9da0b6e39451b68301c7b69c20ac2ce67d99954ec837ab) |
| 6. Test the exit, unlocked | `withdraw(5)` succeeds — same function, same funds, only the lock changed | [`0x4d0102ae…`](https://coston2-explorer.flare.network/tx/0x4d0102aeb52ad45a0e458fb1360f3f3176ae3fd05c63f94364539a4a58fb5815) |

Two earlier live runs on this same policy landed in the gray zone instead and were consulted to
Claude directly — both real, both genuinely reasoned, both correctly judged a sub-2-bip move as
noise rather than a threat (`INCREASE_MONITORING`, no state change, `AgentResponded` event only).
The immediate-defense run above is the other real branch of the same three-tier design: the
contract needed no help this time, because the case wasn't ambiguous.

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
