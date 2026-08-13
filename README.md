# Onchain Sentinel

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

**The defense transaction shown in the demo video, executed by the agent through KeeperHub, on Base
mainnet:**

[`0x96f235063de478fb55bfac892c131b0ec48960fb51c0dbfa5238e4cd63692cc6`](https://basescan.org/tx/0x96f235063de478fb55bfac892c131b0ec48960fb51c0dbfa5238e4cd63692cc6)

This is `SUPPLY_COLLATERAL` — the action Claude picked after reading the wallet's real Aave
position live. Before the transaction: health factor **1.1001**, $36.51 collateral, $27.09 debt —
close enough to liquidation that roughly a 9% adverse move in ETH would trigger it. After: health
factor **1.3875**, $46.50 collateral, debt unchanged — the agent's own transaction moved the number
it was judged on.

> **How to verify it.** Open the hash above, not the wallet address. Gas on this run was sponsored,
> which means a relayer submitted it: the top-level `from` is an address you won't recognise, `to`
> is the contract that executes on the wallet's behalf, and `value` is `0`. The actual call sits
> under **Internal Transactions**. A sponsored transaction never appears in the sending wallet's own
> transaction list — checking the address instead of the hash makes a successful run look like
> nothing happened.

**The same wallet's health factor moved through three real risk levels in one session, and the
agent gave a different, genuinely reasoned verdict at each one** — not three scripted branches,
three live calls to Claude against three different real onchain states:

| Health factor | Verdict | Action |
|---|---|---|
| 2.00 | "ETH would need to fall ~50% before liquidation" | `NO_ACTION` |
| 1.30 | "buffer is thin enough to erode quickly" | `INCREASE_MONITORING` |
| 1.10 | "only ~9% of ETH downside before liquidation" | `SUPPLY_COLLATERAL` / `REPAY_DEBT` |

**An earlier proof transaction**, from before Aave writes were live — a sponsored `web3/approve-token`
call on an empty wallet, the first transaction this agent ever executed through KeeperHub:
[`0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6`](https://basescan.org/tx/0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6)

**Watches the agent generated,** both live in our KeeperHub organization and both built from a
wallet's onchain state rather than filled into a form — hourly schedule trigger,
`aave-v3/get-user-account-data`, network `8453`:

- `sentinel-0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c` — id `r6zhrb1yc7fgr7pre8oe3`
- `sentinel-0x2b33afb068a77b103fFAF0b7d9F128209076BcE3` — id `uaovii0ha77nknkfqhjaz`

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
finds. The two workflows above were produced for two different addresses, with nobody choosing a
parameter for either.

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
HTTP). `create_workflow` deploys the watch and `execute_protocol_action` runs the response. See
`app/executors/keeperhub.ts`.

**Workflow builder** — watches are created as real workflows with trigger and action nodes, so they
appear and run in KeeperHub like any hand-built one.

**Audit trail** — `get_execution` is the strongest observability surface here: per-node status,
timings, and `transactionHashes[]` with `verified: true` and `receiptStatus` reconciled against the
onchain receipt. We used it through the MCP tools to confirm the proof transaction, because
`execute_workflow` returns only `{executionId, status: "running"}` — triggering is not completion.
The shipped executor takes the direct path (`execute_protocol_action`), which returns the
transaction link synchronously, so it does not poll; wiring the workflow path through `get_execution`
is the natural next step and is not done.

**Gas sponsorship** — every transaction shown here, across `web3/approve-token` and `aave-v3/supply`
/`borrow`/`repay` alike, came back `sponsored: true`. The approve above ran on an empty wallet;
`aave-v3/*` needed a small native balance present in the wallet to be accepted at all, but the gas
itself was still relayer-paid, not drawn from that balance. Real cost per transaction: a few
thousandths of a dollar.

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
   │   analyzer → reads the chain  │
   │   prompt   → assembles + validates
   │   claude   → the judgment call
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
app/agent/       analyzer, prompt assembly, the Claude call, verdict validation, templates
app/executors/   Executor interface, KeeperHub adapter, Flare adapter
app/app/         run console (_components) and its server actions (_actions)
app/scripts/     repeatable demo runners and the onchain reserve verifier
contracts/       SentinelVault.sol — the Flare track, deployed on Coston2
```

---

## What is honest about this build

**The judgment step is a real API call, and the enum is enforced twice.** `buildAgentPrompt()`
assembles the prompt from the templates and the live position, `askAgent()` sends it to Claude, and
`parseVerdict()` validates what comes back — one server action, one button. The response schema
builds its `action` enum by spreading the same constant the executor maps from, so the schema cannot
drift from the code; a verdict naming anything outside it is rejected before execution is reachable.
A copy-paste path is still in the UI behind a disclosure, for running the demo on a machine with no
API key.

**Defense is limited to the wallet KeeperHub can sign for.** Monitoring works for any address you
type in — the two generated watches prove that. Acting on a position requires being that position's
owner, and KeeperHub signs for its own Turnkey wallet. Extending defense to arbitrary wallets means
Aave credit delegation, which is roadmap.

**The Flare track is a sibling, not decoration.** `SentinelVault.sol` is deployed on Coston2 at
[`0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF`](https://coston2-explorer.flare.network/address/0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF)
and reads live FTSO prices to make the same call without an LLM in the loop. `FlareExecutor`
implements the same two methods against it, so the interface has two real implementations rather
than one and a placeholder — `setPolicy`
([`0x270ad4a0…`](https://coston2-explorer.flare.network/tx/0x270ad4a0268d0e7b92657464da9b0d4309d57ff6e35415e81ae7e528e6b5b217))
anchored the policy to a live FTSO price, and an agent verdict of `LOCK_POSITION`
([`0xcc8092c9…`](https://coston2-explorer.flare.network/tx/0xcc8092c96f2f55f6815ec22c6c3736192c83546a1696e4d9a9e4cec71e72a222))
flipped `isLocked` on chain. Judge this submission on the KeeperHub track; the Flare work is here
because it is what makes the executor boundary a claim about code rather than about intent.

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
ANTHROPIC_API_KEY=sk-ant-...               # the diagnosis step; without it, use the manual fallback
```

Headless runs of the same pipeline:

```bash
npm run demo:phase0 --prefix app -- 0x...                      # read state, deploy the watch
npm run demo:execute --prefix app -- REPAY_DEBT '{"asset":"0x...","amount":"100000"}'
npm run demo:live-run --prefix app                              # analyze → diagnose → execute → verify, end to end
```

A few of the enum's actions map to KeeperHub calls our TypeScript client doesn't wrap yet
(`aave-v3/borrow` has no slot in `ActionType`, since Aave's own borrow isn't something the agent is
meant to initiate — only respond to). These go through the org API key directly rather than through
`KeeperHubExecutor`:

```bash
npm run demo:raw-call --prefix app -- <contract> <function> '[args]'      # execute_contract_call
npm run demo:raw-action --prefix app -- <actionType> '{"params":"..."}'   # execute_protocol_action
npm run demo:raw-status --prefix app -- <executionId>                     # poll a direct execution
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

They're written up with reproductions and suggested fixes — along with the four surfaces that saved
us more time than these cost — in [`KEEPERHUB-TEARDOWN.md`](KEEPERHUB-TEARDOWN.md).
