# Sentinel

**Give it a wallet address. It reads the position onchain, designs a watch for that specific
wallet, diagnoses the risk with an LLM, and defends the position through KeeperHub.**

Agents can think. KeeperHub lets them act. Sentinel is built on exactly that seam: the judgment
is a language model, and every step that has to be reliable — the watching, the signing, the
transaction — is deterministic infrastructure it never touches.

---

## The bar we held ourselves to

Two things decide whether this project is finished. Everything else is decoration.

1. **It reads real data from the chain.** Not a fixture, not a replayed scenario — the live
   collateral, debt and health factor of a real wallet, read from Aave v3 on Base mainnet.
2. **The agent actually diagnoses that data.** Not a hand-written incident pasted into a prompt.
   The numbers from step 1 go to Claude, and Claude's verdict comes back and drives what happens.

If those two hold, the rest is plumbing. If they don't, no amount of UI polish makes it real.

---

## What it does, in five steps

The dashboard is deliberately not a product UI. It is a run console that exposes every
intermediate result — raw contract values, the exact prompt sent to the agent, the unedited
KeeperHub response, transaction hashes — because the claim is that each step really happened, and
you should be able to check.

| # | Step | What actually runs |
|---|------|--------------------|
| 1 | **Read the position** | `getUserAccountData` on the Aave v3 Pool, Base mainnet. Health factor, collateral, debt, LTV, liquidation threshold — plus the unmodified `uint256`. |
| 2 | **Design and deploy the watch** | The agent builds a workflow from what it just read and creates it over KeeperHub's MCP server. A scheduled job now re-checks this wallet hourly. |
| 3 | **Diagnose** | Code assembles the full prompt from the templates plus the live data. Claude answers with `{severity, diagnosis, action, rationale}` — and `action` is rejected in code if it falls outside the enum. |
| 4 | **Execute onchain** | The chosen action goes to KeeperHub. Turnkey signs it inside a secure enclave. No human key, no wallet popup. |
| 5 | **Confirm it moved** | Read the same contract again. A defense that doesn't change the numbers didn't happen. |

---

## Proof

**A transaction this agent executed through KeeperHub, on Base mainnet:**

[`0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6`](https://basescan.org/tx/0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6)

> **How to verify it.** Open the hash above, not the wallet address. Gas on this run was sponsored,
> which means a relayer submitted it: the top-level `from` is an address you won't recognise, `to`
> is the contract that executes on the wallet's behalf, and `value` is `0`. The actual call sits
> under **Internal Transactions**. A sponsored transaction never appears in the sending wallet's own
> transaction list — checking the address instead of the hash makes a successful run look like
> nothing happened.

**Watches the agent generated,** both live in our KeeperHub organization, each built from a
different wallet's onchain state rather than filled into a form:

- `sentinel-0x2b33afb068a77b103fFAF0b7d9F128209076BcE3` — id `0px5s4xgnxtcispelwgjy`
- `sentinel-0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c` — id `fg7jptf2rihuc6eozwydx`

**Execution wallet** (Turnkey EOA, provisioned by KeeperHub):
[`0x2b33afb068a77b103fFAF0b7d9F128209076BcE3`](https://basescan.org/address/0x2b33afb068a77b103fFAF0b7d9F128209076BcE3)

**Contract addresses this build reads and writes** — every one of them confirmed by reading
`getReservesList` and decoding `getConfiguration` on chain, not copied from a doc
(`app/scripts/check-base-reserve.ts` is the script that did it):

| | Address | Decimals | LTV | Liquidation threshold |
|---|---|---|---|---|
| Aave v3 Pool (Base) | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` | — | — | — |
| WETH | `0x4200000000000000000000000000000000000006` | 18 | 80% | 83% |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 | 75% | 78% |

---

## Why this isn't the template

KeeperHub's own template library already ships `Aave V3 Health Factor Guardian` and
`Aave V3 Auto-Repay on Low Health`. Automatic defense is not the interesting part — that exists.

Two things here don't:

**The watch is designed, not filled in.** A template is a form: you pick the asset, you type the
threshold, you enable it. Sentinel reads the wallet first and generates the workflow from what it
finds. The two workflows listed above were produced for two different addresses without anyone
choosing a parameter.

**The response is a judgment, bounded in code.** A template runs `if HF < 1.5 then repay`. Sentinel
hands live data to a language model and takes back a decision — but the decision is only allowed to
be one of seven predefined actions:

```
NO_ACTION · INCREASE_MONITORING · SUPPLY_COLLATERAL · WITHDRAW_COLLATERAL
REPAY_DEBT · LOCK_POSITION · ACCELERATE_ORACLE
```

That constraint is not a request in the prompt. `parseVerdict()` in `app/agent/prompt.ts` validates
the model's `action` against the enum and rejects anything else before it can reach an executor.
The model can be wrong about severity; it cannot invent an action that moves funds somewhere we
never sanctioned.

---

## KeeperHub surfaces used

**MCP server** — the agent talks to KeeperHub over MCP (`@modelcontextprotocol/sdk`, streamable
HTTP). `create_workflow` deploys the watch, `execute_protocol_action` and `execute_workflow` run
actions, `get_execution` reads results back. See `app/executors/keeperhub.ts`.

**Workflow builder** — watches are created as real workflows with trigger and action nodes, so they
appear and run in KeeperHub like any hand-built one.

**Audit trail** — `get_execution` is what we verify against, and it is the strongest observability
surface here. It returns per-node status, timings, and `transactionHashes[]` with `verified: true`
and `receiptStatus` reconciled against the onchain receipt. The tool's own contract is explicit
that triggering is not completion, so the console polls it rather than trusting the trigger
acknowledgement.

**Gas sponsorship** — the proof transaction above ran on an empty wallet. The execution response
reports `sponsored: true`, and it cost 117,664 gas at 0.006 gwei, about **$0.003**.

**Idempotency** — every provisioning call carries `idempotency_key: provision-<address>`, so
re-running the demo against the same wallet doesn't stack duplicate watches. Rehearsals are safe.

---

## Architecture

```
        wallet address
              │
   ┌──────────▼───────────┐
   │  Dashboard (Next.js) │   run console — every step exposed
   └──────────┬───────────┘
              │
   ┌──────────▼────────────────────┐
   │  Agent                        │
   │   analyzer  → reads the chain │
   │   prompt    → assembles + validates
   │   strategist→ picks from the enum
   └──────────┬────────────────────┘
              │  Executor interface — the only thing the agent knows
     ┌────────┴────────┐
     ▼                 ▼
 KeeperHubExecutor   FlareExecutor
 (MCP, Turnkey)      (SentinelVault on Coston2)
```

The body of the system knows `provisionMonitoring()` and `execute()` and nothing else. There is no
`if (target === 'keeperhub')` anywhere outside `app/executors/`. That boundary is why the same brain
drives a second execution engine — an onchain contract on Flare — without the agent changing.

```
app/agent/       analyzer, prompt assembly + verdict validation, prompt templates
app/executors/   Executor interface, KeeperHub adapter, Flare adapter
app/app/         run console (_components) and its server actions (_actions)
app/scripts/     repeatable demo runners and the onchain reserve verifier
contracts/       SentinelVault.sol — the Flare track, deployed on Coston2
```

---

## What is honest about this build

**Diagnosis is relayed by hand, and the relay is the only manual part.** `diagnoser.ts` and
`strategist.ts` are stubs; wiring the Claude API is roadmap, not done. What is *not* manual is
everything around it: `buildAgentPrompt()` assembles the complete prompt from the templates and the
live data, and `parseVerdict()` validates what comes back. An operator copies one finished string
into Claude and pastes one JSON answer back. Replacing that copy-paste with an API call changes no
other line — which is precisely why we built the assembly and validation in code instead of doing
them by hand and claiming the same thing.

**Defense is limited to the wallet KeeperHub can sign for.** Monitoring works for any address you
type in — the two generated watches prove that. Acting on a position requires being that position's
owner, and KeeperHub signs for its own Turnkey wallet. Extending defense to arbitrary wallets means
Aave credit delegation, which is roadmap.

**The Flare track is a sibling, not decoration.** `SentinelVault.sol` is deployed on Coston2 at
[`0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF`](https://coston2-explorer.flare.network/address/0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF)
and reads live FTSO prices to make the same call without an LLM in the loop. It is in this repo
because it is the second implementation behind the same interface. It is not part of this
submission's claim.

---

## Run it

Node 24.15.0 (`.nvmrc`).

```bash
npm install --prefix app
cp .env.example app/.env      # fill in the KeeperHub section
npm run dev --prefix app
```

`app/.env` needs:

```
KEEPERHUB_API_KEY=kh_...                  # organization key, used for MCP over HTTP
KEEPERHUB_EXECUTOR_ADDRESS=0x...          # the Turnkey wallet; Aave actions need it as onBehalfOf
KEEPERHUB_DEV_CHAIN_ID=8453               # Base. Aave v3 actions are not available on Sepolia
```

Headless runs of the same pipeline:

```bash
npm run demo:phase0 --prefix app -- 0x...                      # read state, deploy the watch
npm run demo:execute --prefix app -- REPAY_DEBT '{"asset":"0x...","amount":"100000"}'
```

> Amounts for `aave-v3/*` actions are **uint256 base units**, not decimals — 0.1 USDC is `100000`.
> The `web3/*` family takes the opposite (`"100.50"`, `"max"`). This inversion cost us an afternoon
> and is one of the entries in the teardown below.

---

## Where we got stuck, and what would have helped

A stack of undocumented behaviours cost us real time — `abi` needing to be stringified JSON rather
than an array, `simulate` being a boolean while `gasLimitMultiplier` is a string, `web3/*` actions
rejecting direct execution with a 501, gas sponsorship applying per action family rather than per
execution method, `referralCode` being rejected as missing while the schema calls it optional, and
Aave v3 failing on an unsupported chain with an empty revert instead of saying so.

They're written up with reproductions and suggested fixes in
[`docs/keeperhub-teardown.md`](docs/keeperhub-teardown.md).
