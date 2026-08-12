# KeeperHub integration teardown

Notes from building [Onchain Sentinel](README.md) against the KeeperHub MCP server over four days. Every
item below cost us real time and is reproducible. Where the docs already warn about something, we
say so — several of these are documented, and the point is that documentation alone did not stop us
from hitting them.

Environment: `@modelcontextprotocol/sdk` over streamable HTTP to `https://app.keeperhub.com/mcp`,
organization key (`kh_`), Turnkey EOA execution wallet, Base mainnet (`8453`) and Sepolia
(`11155111`).

---

## 1. `execute_protocol_action` reports failure inside a success envelope

**The one that cost us the most.** MCP has an `isError` flag. This tool does not use it. A failed
call returns `isError: undefined` with the real outcome as a JSON string inside `content[0].text`:

```json
{ "success": false, "error": "referralCode: uint16 is missing" }
```

We found it because a supply call "succeeded" and nothing happened on chain.

**Why it matters more than an ordinary error-format quirk.** The obvious client — check `isError`,
treat everything else as fine — silently converts failures into successes. For a product that
defends a lending position, reporting a defense that never executed is the worst possible failure
mode. Any client written the obvious way is wrong in the most dangerous direction.

**Suggested fix.** Set `isError: true` on failures. If the envelope must stay for compatibility,
say so loudly in the tool description — it is the kind of thing that belongs in the first paragraph,
not a footnote.

**Our workaround** ([`app/executors/keeperhub.ts`](app/executors/keeperhub.ts)): parse the body
first, and treat an unparseable body as failure rather than assuming success.

---

## 2. Amount units are inverted between action families

Same field name, same tool, opposite conventions:

| Action family | Format | 0.1 USDC |
|---|---|---|
| `web3/*` | human-readable decimal string, `"max"` accepted | `"0.1"` |
| `aave-v3/*` | uint256 base units | `"100000"` |

Passing `"0.1"` to `aave-v3/supply` returns `422 INVALID_FIELD_TYPE (expected uint256)`. Passing
base units to a `web3/*` action is worse: it is accepted and means something wildly different.

**Suggested fix.** Name the fields differently (`amount` vs `amountBaseUnits`), or state the unit in
the per-action schema returned by `search_protocol_actions`. A caller who has just used one family
has no signal that the other one flipped.

---

## 3. Fields the schema calls optional are rejected as missing

`search_protocol_actions` lists `referralCode` under `optionalFields` for `aave-v3/supply`. Omitting
it fails:

```
referralCode: uint16 is missing
```

`interestRateMode` on `aave-v3/repay` is similar — schema-optional, but Aave's own documentation
says it should always be `2`, and relying on an unstated default is not something you want under a
position at risk.

**Suggested fix.** Move genuinely required fields out of `optionalFields`, or make `optional` mean
"has a documented default" and publish the default.

---

## 4. `web3/*` actions cannot be executed directly

```
501 Not Implemented — Direct execution not supported for web3/approve-token.
Use workflow execution instead.
```

`execute_protocol_action` runs `aave-v3/*` but not `web3/*`. Nothing in the action listing
distinguishes the two, so the split is only discoverable by trying.

An approval is a prerequisite for almost any DeFi action, which makes this the first wall a new
integration hits. The workaround is real work: `create_workflow` with a manual trigger, then
`execute_workflow`.

**Suggested fix.** Add a `directExecutionSupported` boolean to the action schema. One field would
have saved the round trip entirely.

---

## 5. Gas sponsorship splits by action family, and the failure is a balance error

Sponsorship is not a property of the wallet or the execution method. It follows the action family.
Verified on Base with an empty execution wallet, through both the direct path and a workflow:

| Action | Result on a zero-balance wallet |
|---|---|
| `web3/approve-token` | `sponsored: true`, succeeded |
| `aave-v3/supply` | `Insufficient BASE balance. Have: 0.0, Need: 0.000000231` |

We had a genuinely sponsored mainnet transaction land from an empty wallet, then assumed the next
action would behave the same way. The amount needed is dust — 0.000000231 ETH — but zero is zero,
and the error reads like an ordinary funding problem rather than "this family is not sponsored."

**Suggested fix.** Publish sponsorship coverage per action family, and make the error say
`this action is not eligible for gas sponsorship` instead of only quoting a balance.

---

## 6. `execute_workflow` returns an acknowledgement, not a result

```json
{ "executionId": "...", "status": "running" }
```

No transaction hash, no success flag. You must poll `get_execution(executionId)`. The tool contract
is explicit that triggering is not completion — credit where due — but the return shape still looks
enough like a result that treating it as one is the natural first mistake.

**Praise where it is due:** `get_execution` is the strongest surface in the whole API. Per-node
status, timings, and `transactionHashes[]` carrying `verified: true` and a `receiptStatus`
reconciled against the on-chain receipt. We verified our submission transaction with it. It deserves
to be more prominent than it is.

---

## 7. Response payload nesting differs between execution paths

- `execute_protocol_action` → `{ success, result: { ... }, addressLink }` — payload nested under
  `result`
- workflow execution via `get_execution` → `output.transactionLink`, flat

A client that supports both has to look in two places for the same value. Ours does.

---

## 8. Serialization is inconsistent across neighbouring fields

Within one `create_workflow` call:

| Field | Expected |
|---|---|
| `abi` | JSON **string**, not an array — silently 422s otherwise |
| `functionArgs` | JSON-stringified positional array |
| `gasLimitMultiplier` | **string**, not a number |
| `network` | **string** chainId (`"8453"`) |
| `simulate` | JSON **boolean** `true` — the opposite of the two above |

There is no rule to infer here; each field has to be memorized. `simulate` being a real boolean
while `gasLimitMultiplier` is a string is the pair that caught us twice.

**Suggested fix.** Accept both forms and coerce. Failing that, a single table in the docs listing
every field that takes a stringified value would do most of the work.

---

## 9. Aave v3 on an unsupported chain fails without saying so

Aave v3 actions are not available on Sepolia. The failure does not say "unsupported network" — it
surfaces as an empty revert, which reads like a bad calldata encoding or a wrong contract address.
We spent a while checking our own encoding before finding the plugin doc that states the supported
chain list.

This one has an outsized cost: testnet is exactly where a team validates a DeFi integration, so the
misleading error lands at the worst moment. It is also what forced our demo onto mainnet, which
meant real funds on the critical path.

**Suggested fix.** Validate the chain against the plugin's supported list before dispatching, and
return `aave-v3 is not available on network 11155111`.

---

## 10. `list_workflows` returns soft-deleted workflows

`delete_workflow` is a soft delete: it sets `deletedAt` and returns `{ "success": true }`. But
`list_workflows` keeps returning those rows, `deletedAt` populated and `enabled` still `true`.

We deleted two obsolete watches, listed to confirm, and saw them still there — which reads exactly
like a delete that silently failed. Only fetching `get_workflow` and reading `deletedAt` showed the
delete had worked.

**Suggested fix.** Filter soft-deleted rows out of `list_workflows` by default, and add an
`includeDeleted` flag for callers who want them. Any client that lists and counts is otherwise
wrong, and the natural verification step after a delete reports the opposite of the truth.

---

## 11. Writes 401 on the OAuth MCP session while reads succeed

Connected through the MCP OAuth flow, `list_workflows` and `get_workflow` work, but
`delete_workflow` returns a bare `401 Unauthorized`. The same operation with an organization
`kh_` key over streamable HTTP succeeds immediately.

The 401 body carries nothing but `{"error":"Unauthorized"}` — no mention of a missing scope or of
which credential would work. Since reads on the same session are fine, the natural conclusion is an
expired session rather than a permission boundary, and that sends you to re-authenticate instead of
switching credentials.

**Suggested fix.** Return `403` with the required scope named. A message like
`delete_workflow requires mcp:write; this session is read-only` turns a debugging detour into a
one-line fix.

---

## 12. Strict EIP-55 checksums on recipient addresses

Mixed-case addresses whose checksum does not validate are rejected with `Invalid recipient address`.
Correct in principle — but copying an address out of a log that lowercased it, then "fixing" the
capitalization by hand, produces exactly this. All-lowercase is accepted.

**Suggested fix.** Say `address checksum failed — pass all-lowercase or a valid EIP-55 address` so
the fix is obvious from the message.

---

## What worked well

Not everything here is a complaint. Four things saved us more time than the items above cost:

- **`create_workflow` validates action configs.** It returns `422` with `invalidFields` naming the
  field and its expected type. `execute_protocol_action` performs no such validation. Once we
  noticed, our workflow for any uncertain parameter set became: build it as a workflow first to get
  the validator's opinion, then execute. That is a genuinely useful asymmetry — it just deserves to
  be documented as a technique.
- **`get_execution`**, as above.
- **Idempotency keys.** `idempotency_key` on provisioning meant rehearsing the demo against the same
  wallet repeatedly without stacking duplicates. For anything that gets filmed, this matters.
- **Turnkey wallet provisioning is invisible in the right way.** The execution wallet existed and
  signed without us handling a private key at any point. Our one confusion was `isManaged: false` on
  the integration, which we misread as "not auto-signing" — it denotes the absence of an attached
  Safe. Worth a clearer field name.

---

*Filed alongside the Onchain Sentinel submission. Every item above is reproducible; the code that works
around them is in [`app/executors/keeperhub.ts`](app/executors/keeperhub.ts).*
