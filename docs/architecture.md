# architecture.md — Sentinel 전체 아키텍처

> 이 문서는 "무엇을 만들지"(설계 + 확정 기술 스펙)를 담는다.
> "일하는 법"(규칙)은 `/CLAUDE.md`, "지금 어디까지 됐는지"(진행상황)는 `docs/todo.md`.
> **여기 있는 주소/함수/스키마 값만 사용하라. 없는 값은 지어내지 말고 사용자에게 물어라.**

---

> 하나의 두뇌(Agent) + 하나의 얼굴(Dashboard) + 두 개의 실행 엔진(KeeperHub / Flare)
> 3개 해커톤(KeeperHub / Flare / CTC)에 파생 출품하기 위한 단일 소스 문서.
>
> ⚠️ v3 갱신: KeeperHub·Flare 문서 실사 완료 → **모든 기술 빈칸 확정.** 개발/데모는 Claude Desktop/Code 기반(Claude API 서버는 로드맵). 지갑은 주소 입력만. Flare Phase 2(자동 에스컬레이션)는 데모에서 로드맵.

---

## 범례 (파트 구분 태그)

- **파트 태그**: `[Next.js]` `[Agent]` `[Backend]` `[Contract]` `[Infra]` `[Docs]`
- **소속 태그**: 🟢 공유 / 🔵 KeeperHub 전용 / 🟠 Flare 전용 / 🟣 CTC 전용(후속)

---

## 0. 한 줄 정의

**지갑 주소 하나를 주면, AI 에이전트가 그 지갑에 필요한 감시망을 설계해 배치하고, 위기 상황을 진단해 온체인에서 직접 방어하는 자율 가디언.**

핵심 설계 원칙: **판단(LLM)과 실행(결정론적 인프라)의 분리.** LLM은 신뢰성이 필요한 경로에 끼지 않는다. 감시·실행은 인프라가 보장하고, LLM은 그 인프라를 설계·조정·활용하는 두뇌 역할만.

---

## 1. 전체 구조 개관

```
        [유저]
          │  지갑 주소 입력 / 정책 등록
          ▼
   ┌─────────────────────┐
   │ [Next.js] Dashboard │  🟢 공유
   └──────────┬──────────┘
              │
   ┌──────────▼───────────────────────┐
   │ [Agent] 두뇌 (Claude Desktop/Code)│  🟢 공유
   │  analyzer → diagnoser → strategist│
   │  Executor 인터페이스 (추상화)      │  🟢 공유
   │   ├─ KeeperHubExecutor  🔵        │
   │   └─ FlareExecutor      🟠        │
   └──────────┬────────────┬───────────┘
       🔵 MCP │            │ 🟠 tx 서명
              ▼            ▼
   ┌──────────────┐  ┌──────────────────────┐
   │ [Infra]      │  │ [Contract]           │
   │ KeeperHub    │  │ SentinelVault.sol    │
   │ (남의 인프라) │  │ (우리 소유, Coston2) │
   │ 🔵 전용      │  │ 🟠 전용              │
   └──────────────┘  └──────────────────────┘
```

**만드는 것 = 통합 백엔드 레포 1개 + SentinelVault.sol 1개.** 분기는 executor 파일 레벨에서만.

---

## 2. 파트별 상세

### [Next.js] Dashboard — 🟢 공유
- 지갑 주소 등록(문자열 입력만, 지갑 연동/메타마스크 불필요)
- 에이전트 분석 로그 / 감시망 현황 / 판단 로그(severity·diagnosis·rationale)
- 배포: Vercel. 화려함보다 "실행 증명"에 무게

### [Agent] 두뇌 로직 — 🟢 공유
- analyzer(지갑 분석→리스크 프로파일) / diagnoser(사건→진단) / strategist(진단→액션 enum 선택)
- prompts/ , 구조화 출력 `{ severity, diagnosis, action(enum), rationale }`
- 런타임: Claude Desktop/Code + MCP (프레임워크 없음, "or your own"). API+서버는 로드맵
- 안전장치: 출력은 사전정의 액션 enum으로 제한

### [Backend] 몸통 — 🟢 공유 (마지막 한 겹만 분기)
- 지갑 조회(viem/ethers, 둘 다 EVM) / Supabase 로깅 / 대시보드 API
- 핵심 추상화 Executor 인터페이스:
```
interface Executor {
  provisionMonitoring(profile): Promise<void>   // 감시망 설치
  execute(action): Promise<TxResult>            // 대응 실행
}
```

### [Backend/executors] KeeperHubExecutor — 🔵 전용 (~150줄)
- MCP 툴 호출. provisionMonitoring → `create_workflow`. execute → `execute_check_and_execute` / `execute_protocol_action`
- 리스너(HTTP 액션 수신)는 자동화 단계=로드맵

### [Backend/executors] FlareExecutor — 🟠 전용 (~150줄)
- ethers로 SentinelVault 트랜잭션. provisionMonitoring → `setPolicy()`. execute → `agentRespond()`
- 급변 시 `offerIncentive()`(Volatility Incentive) 트랜잭션
- 이벤트 자동 구독(Phase 2)은 로드맵

### [Contract] SentinelVault.sol — 🟠 전용 (유일한 완전 분리 산출물)
- Coston2 배포. 제출물 "smart contract address"에 기입
- **레퍼런스 뼈대**: flare-foundry/hardhat-starter의 `PriceTriggeredSafe`(변동성 잠금) + `AssetVault`(담보 대출) 예제 결합
```
SentinelVault.sol (Coston2, EVM=cancun)
├─ 정책 저장: 자산별 { feedId, 앵커비교, 임계값(BIPS), 액션enum }
├─ checkAndExecute()  [퍼미션리스 — 키퍼 호출]
│    ├ FtsoV2 빠른피드 조회 (+ 앵커 대조)
│    ├ 괴리 작음 & 조건 명백 → 즉시 방어 (isLocked 등)
│    └ 괴리 큼/회색지대 → EscalationRequested emit
├─ submitCrossChainProof(proof) [퍼미션리스] ※ FDC, 스코프밸브
└─ agentRespond(actionEnum) [에이전트, 화이트리스트] ※ Phase2 로드맵
```

### [Infra] KeeperHub — 🔵 전용 (남의 인프라, 조작 대상)
- 워크플로우(트리거: Schedule/Event/Webhook/Block/Manual)
- Turnkey 지갑(자동 서명, 메타마스크 무관) / Smart Gas / 재시도 / Private Routing / Audit Trail
- MCP 서버(30+ 툴). 보호대상=주소입력, 실행지갑=Turnkey

---

## 3. ✅ 확정 기술 스펙 (구 "미해결 과제" → 전부 확정)

### 🔵 KeeperHub 기술 스펙

**MCP 연결:**
```
claude mcp add --transport http --scope user keeperhub https://app.keeperhub.com/mcp
# 이후 /mcp 로 OAuth. 헤드리스는 --header "Authorization: Bearer kh_..."
```
- 키: `kh_`(조직, REST/MCP용) / `wfb_`(유저, 웹훅용)

**실행 지갑 (8/6 확인, 조직 내 유일):**
- integrationId `5h4tgy5hy0ge3yiiwlysh` / 주소 `0x2b33afb068a77b103fFAF0b7d9F128209076BcE3`
- type `web3`, `isManaged: false`, `config: {}` (생성 2026-07-31)
- ✅ **해소됨(8/6, Wallet Management 문서)**: Turnkey가 KeeperHub의 기본 지갑 공급자이며 **이메일 인증 시 조직당 1개 자동 프로비저닝**된다.
  이 주소가 그 Turnkey EOA다. 키는 secure enclave(TEE) 안에 있고 워크플로우 tx에 자동 서명한다 → **무인 대응 전제 유효**.
  `isManaged:false`는 커스터디 여부가 아니라 **Safe 스마트 계정 미부착** 상태로 읽는다(Safe는 명시적 옵트인).
- 지갑이 탐색기에서 컨트랙트 코드를 가진 것처럼 보일 수 있음(네트워크당 1회 delegation) — 정상.

**서명 경로 3종 (Sender 토글로 결정):**

| | EOA only | Safe (Sender ON) | Safe + Zodiac Roles |
|---|---|---|---|
| 타깃의 `msg.sender` | Turnkey EOA | Safe | Safe |
| 가스 지불 | **항상 Turnkey EOA** | 항상 EOA | 항상 EOA |
| 토큰/스왑 차감 | EOA 잔고 | Safe 잔고 | Safe 잔고(한도 내) |
| 가스 스폰서십 | **가능** | 불가 | 불가 |
| 함수·인자 화이트리스트 | 없음 | 없음 | **있음(온체인)** |

- ⚠️ **가스는 언제나 EOA, 토큰은 활성 Sender**. 둘 다 충전해야 한다(가장 흔한 실패 원인).
- Safe 지원 체인: Ethereum, Base, Arbitrum, Optimism, Polygon, **Ethereum Sepolia** (Base Sepolia 없음)
- Zodiac Roles: 프로토콜/함수/인자 단위 온체인 허용목록 + 토큰별 지출 한도. `karpatkey/defi-kit` 프리셋.
- ⚠️ **owner-bypass**: threshold=1에서 EOA가 Safe 소유자이자 role 보유자라 `safe.execTransaction` 직접 호출로 우회 가능.
  → **"정책(policy)이지 경계(boundary)가 아니다."** 서면에 보안 경계라고 쓰지 말 것. 다중 소유자(threshold>1)는 로드맵.

**가스 스폰서십 (Turnkey Gas Station):**
- 조건 **전부** 충족 시에만: 지원 네트워크 + **Safe 미사용(직접 지갑 sender)** + **공개 멤풀** + 가스 크레딧 잔여
- 지원: Ethereum, Base, Polygon, Arbitrum + 테스트넷(Sepolia, Base Sepolia, Polygon Amoy, Arbitrum Sepolia)
- **테스트넷 사용은 크레딧 차감 없음**, 메인넷만 차감
- 가스 "수수료"만 대납. 전송 자산(ETH/USDC 등)은 자기 잔고에서 나간다
- ⚠️ **private routing(비공개 멤풀)을 켜면 스폰서십이 꺼진다** → 7장 데모 구성과 충돌, 둘 중 택일

**⚠️ 스폰서 tx의 온체인 모습 (데모·심사 증빙에 치명적):**
- From = 모르는 릴레이어 주소 / To = 모르는 컨트랙트 / Value = `0` / 우리 액션은 **internal call**
- **반드시 `transactionHash`로 검증**. 지갑 주소의 tx 목록에는 **안 나타난다** (스폰서 tx는 우리 지갑이 보낸 게 아님)
- 심사위원이 지갑 주소를 열어보면 "아무 일도 없었던 것처럼" 보임 → 제출물에는 **tx 해시 링크**를 명시하고 Logs/Internal Txns 탭을 안내할 것

**가스 한도:** `eth_estimateGas` × 배수. 기본 배수 Ethereum 2.0(보수 2.5) / Base 1.5(보수 2.0).
보수 배수는 **event·webhook 등 시간민감 트리거**에 적용. 노드별 절대 gasLimit 지정 시 배수는 무시된다.

**핵심 MCP 툴 (총 30+, `tools_documentation`/`list_action_schemas`로 최신 확인):**
- 생성: `create_workflow`(nodes+edges), `ai_generate_workflow`(자연어), `validate_workflow`, `update_workflow`, `list_workflows`, `get_workflow`
- 실행: `execute_check_and_execute`(읽고-판단-실행 한방 ★), `execute_protocol_action`, `execute_contract_call`, `execute_transfer`, `get_direct_execution_status`, `execute_workflow`, `get_execution`
- 발견: `list_action_schemas`, `search_protocol_actions`
- 분석: `web3/check-balance`, `web3/read-contract` (지갑 불필요)
- 지갑: `list_integrations`(먼저 호출해 ID 확보) → `get_wallet_integration(integrationId)` ※ per-action walletId는 없지만 **integrationId는 필수**
- 마켓플레이스: `list_workflow`, `search_workflows`, `call_workflow`, `get_workflow_listing`, `update_workflow_listing`, `unlist_workflow`
- 템플릿: `search_templates`, `get_template`, `deploy_template`(내 조직으로 복제)
- 플러그인: `search_plugins`, `get_plugin`
- 프로젝트/태그(워크플로우 그룹핑): `list_projects`, `create_project`, `list_tags`, `create_tag` — 연결은 create/update_workflow에 `projectId`/`tagId`, 해제는 `null`

**실사 완료(8/6, MCP 연결 후 `tools_documentation`):** 위 이름들 실재 확인. 추가 발견 = `delete_workflow`, `prepare_test_pin_data`.

**DeFi 프로토콜 액션:** `execute_protocol_action`, actionType = `protocol/action-slug` (예: `aave-v3/supply`, `aave-v3/repay`). `search_protocol_actions`로 발견.

**워크플로우 JSON:** node `{id,type,data:{label,type,config}}`, edge `{id,source,target,sourceHandle?}`. 조건분기 sourceHandle `"true"`/`"false"`. 템플릿 `{{@nodeId:Label.field}}` (엄격 검증).

**⚠️ 함정 (문서가 "undocumented"로 명시):**
1. `abi`는 배열 아니라 **JSON.stringify한 문자열** (안 하면 조용히 422)
2. `functionArgs`는 **JSON 문자열화한 위치 배열**
3. `gasLimitMultiplier`는 숫자 아니라 **문자열**
4. `network`는 **문자열 chainId** ("1","11155111","8453")
5. deadline 등은 템플릿 산술 말고 **미리 계산**해서 주입
6. `simulate`는 문자열 아니라 **JSON 불리언** `true` (3·4번과 반대 방향이니 헷갈리지 말 것)
7. 실제 실행은 **고유 `idempotency_key`** 필요 (simulate 인자에서 `simulate`만 빼고 키 추가해 재호출)
8. **시뮬레이션은 EVM 전용** — Solana(101/103 및 별칭)는 API 호출 전 거부
9. `recipientAddress`는 **엄격한 EIP-55 체크섬 검증**. 대소문자 섞인 주소의 체크섬이 틀리면 거부(`Invalid recipient address`).
   → **전부 소문자로 넘기거나** 정확한 체크섬 형태로. 손으로 대소문자 고치지 말 것
10. `kh_` 키에 스코프가 걸려 있으면 쓰기 작업에 **`mcp:write` 스코프** 필요 (없으면 403). 스코프 없는 키는 통과

**직접 실행 안전 절차 (문서 명시, 반드시 이 순서):**
1. `simulate: true`로 먼저 실행
2. `success === true` **그리고** `wouldRevert === false`일 때만 진행 (툴 에러면 즉시 중단)
3. 동일 인자 + `idempotency_key`로 재호출
4. `get_direct_execution_status`를 백오프 폴링 → 최종 `transactionLink`를 온체인 증빙으로 보관

**체인 ID 전체 목록:** `list_action_schemas`에 `includeChains: true`

**체인:** 개발 Sepolia(11155111)/Base Sepolia(84532). USDC 주소·파우셋은 Quickstart 참조.
- 8/6 정정: **테스트넷도 가스 스폰서십 대상이고 크레딧을 안 먹는다.** "제출 tx는 반드시 mainnet"이 아니다.
  메인넷 tx는 심사 임팩트가 크지만 크레딧을 소모하므로, 개발·리허설은 테스트넷 / 제출용 1~2건만 메인넷을 권장.
- **Sepolia 권장**: 스폰서십 + Safe 둘 다 지원되는 유일한 테스트넷 (Base Sepolia는 Safe 미지원).

### 🟠 Flare 기술 스펙

**네트워크 Coston2:**
- RPC: `https://coston2-api.flare.network/ext/C/rpc`
- chainId: **114** / 익스플로러: `https://coston2-explorer.flare.network`
- 파우셋: `https://faucet.flare.network/coston2` (C2FLR)
- **EVM 버전 반드시 `cancun`** (foundry.toml / hardhat.config)

**개발 킷:** `flare-foundry-starter` 또는 `flare-hardhat-starter` (remappings·env 세팅됨). 패키지 `@flarenetwork/flare-periphery-contracts`.

**FTSO 가격 읽기:**
- 진입점: `ContractRegistry.getFtsoV2()` (프로덕션, payable) / `getTestFtsoV2()` (개발, view·가스無)
- 함수: `getFeedById(bytes21)`→`(uint256 value,int8 decimals,uint64 ts)`, `getFeedsById(bytes21[])`, `getFeedByIdInWei`
- 값 해석: `value / 10^decimals`
- Feed ID: FLR/USD `0x01464c522f...`, BTC/USD `0x014254432f...`, ETH/USD `0x014554482f...`
- 주소(Coston2): FtsoV2 `0x3d893C53D9e8056135C26C8c638B76C8b60Df726`, FeeCalculator `0x88A9315f96c9b5518BBeC58dC6a914e13fAb13e2`

**★ Volatility Incentive (킬러 기능):**
- 컨트랙트 `FastUpdateIncentiveManager` (인터페이스 `IFastUpdateIncentiveManager`, ContractRegistry로 조회)
- `getCurrentSampleSizeIncreasePrice()` → 현재 가속 비용 / `offerIncentive({rangeIncrease,rangeLimit})` payable → 가속
- 1회 = 8블록 지속. "AI가 급변 감지 → offerIncentive로 오라클 가속"

**FDC (스코프 밸브):**
- `ContractRegistry.getFdcVerification().verifyWeb2Json(proof)` 패턴
- 흐름: 요청 → 라운드 파이널 대기 → DA Layer에서 증명 fetch → 컨트랙트 제출·검증 (분 단위)
- env: `VERIFIER_URL_TESTNET`, `VERIFIER_API_KEY_TESTNET`, `COSTON2_DA_LAYER_URL`

**키퍼:** 컨트랙트는 스스로 안 깨어남. `checkAndExecute()`를 퍼미션리스로 열고 단순 cron 봇이 주기 호출 (Flare 표준 패턴 = adapter의 `refresh()`/`checkMarketVolatility()`).

**레퍼런스 구현(공식 예제, 뼈대 재사용):**
- `PriceTriggeredSafe` — 변동성 감지 시 자동 잠금 (우리 Phase 1의 베이스라인)
- `AssetVault` — deposit/borrow/repay/withdraw + LTV (담보 방어 뼈대)

---

## 4. 라이프사이클 (버전 공통 패턴)

- **Phase 0 Provisioning**: 🟢 analyzer 분석 → 🔵 `create_workflow` / 🟠 `setPolicy()`
- **Phase 1 Steady State**: 🔵 워크플로우 조건노드 즉시실행 / 🟠 `checkAndExecute()` 퍼미션리스, 컨트랙트 자체 방어 (LLM 무관여)
- **Phase 2 Escalation**: 🔵 데모는 사람이 사건 투입→Claude 진단→대응(반자동, API불필요) / 🟠 이벤트 자동구독은 로드맵
- **Phase 3 Adaptation**: 로그 리뷰→임계값/감시 조정. 로드맵

---

## 5. 두 버전의 결정적 차이

| 항목 | 🔵 KeeperHub | 🟠 Flare |
|---|---|---|
| 감시망이 사는 곳 | 오프체인 SaaS 워크플로우 | 온체인 컨트랙트 |
| 신뢰 모델 | 인프라 신뢰 | 누구도 안 믿어도 됨 |
| 데이터 출처 | 외부 API/RPC | FTSO/FDC(체인 내장 합의) |
| 서버 다운 시 | 감시 중단 | 핵심 방어 계속(퍼미션리스) |
| 핵심 산출물 | 웹+에이전트 | 웹+에이전트+컨트랙트 |
| 데모 Phase 2 | 반자동 시연 | 로드맵 |

한 줄: **KeeperHub=신뢰할 인프라에 위임, Flare=신뢰가 필요없게 온체인에 박제.**

---

## 6. 공유 / 분기 요약표

| 파트 | 소속 | 비고 |
|---|---|---|
| [Next.js] Dashboard | 🟢 | 한 벌 |
| [Agent] analyzer/diagnoser/strategist + prompts | 🟢 | 알맹이 |
| [Backend] 몸통 + Executor 인터페이스 | 🟢 | |
| [Backend] KeeperHubExecutor | 🔵 | ~150줄 |
| [Backend] FlareExecutor | 🟠 | ~150줄 |
| [Contract] SentinelVault.sol | 🟠 | 완전 분리 |
| [Infra] KeeperHub | 🔵 | 남의 인프라 |

체감 작업량: "두뇌 1 + 손 2" ≈ 1.4개분.

---

## 7. 심사 기준 대응

### 🔵 KeeperHub
| 항목 | 대응 |
|---|---|
| 온체인 실행 | Phase1 즉시실행 + Phase2 대응 (실제 tx 링크) |
| KeeperHub surfaces | MCP / create_workflow / audit trail / (Marketplace 등록으로 x402·MPP) |
| Reliability | 실행 신뢰성 KH 위임, 가스/재시도가 데모 주연 ⚠️ private routing은 스폰서십과 배타 — 둘 중 하나만 |
| 실사용성 | "주소 하나로 시작" + Marketplace 등록으로 "실제 호출 가능" 증명 |
| 차별화 | Hub의 정적 템플릿("Aave V3 Health Factor Guardian") vs 우리 AI 동적 생성 |

### 🟠 Flare
| 항목 | 대응 |
|---|---|
| Product usefulness | 멀티체인 자산 보유자 방어 니즈 |
| Flare integration | FTSO 읽기 넘어 Volatility Incentive로 오라클 능동 가속 + 이중피드 교차검증 (non-superficial) |
| Technical execution | Coston2 배포된 작동 컨트랙트 |
| Evidence of new work | 기존:Agent 로직 / 신규:SentinelVault·FTSO·Coston2 배포 |
| Future potential | Phase2 자동화, FDC 유출방어, FAssets(FXRP), FCC(TEE) 로드맵 |

---

## 8. 일정 (KeeperHub 8/13 19:00 / Flare 8/15 04:59, 간극 ~34h)

```
D1-2  KeeperHub 셋업(claude mcp add). MCP로 워크플로우 생성·실행. 첫 tx 성공(분수령)
D3-5  🟢 Dashboard 골격 + Agent 로직 + Executor 인터페이스 (= Flare 두뇌도 제작 중)
D6-7  🔵 KeeperHub Phase0 + 반자동 Phase2 확정. 8/4·8/6 오피스아워 검증
D8-9  🔵 KeeperHub 영상+README+제출 완비
      ▷ 병렬 착수: 🟠 SentinelVault.sol (starter kit clone, PriceTriggeredSafe 기반)
D10-11 🟠 Vault 구현 + FTSO 통합 + Coston2 배포 + FlareExecutor
D12(8/13 19:00) 🔵 KeeperHub 제출 → 남은시간 Flare
D12~D14(~8/15 05:00) 🟠 Vault 마무리·배포 + Flare 영상/서면/제출
```

효율 3원칙: ①두뇌 먼저 손은 어댑터로 ②KH 완성도 몰빵, Flare 스코프밸브 준비 ③문서도 코드처럼 파생. ⚠️ 34h는 마무리·배포용, contract는 D8 병렬착수로 이미 절반 진행 상태여야.

---

## 9. 스코프 밸브 (Flare, 밀릴 때 버리는 순서)

1. **최소 성립선(사수)**: FtsoV2 피드 조회 + 즉시방어/에스컬레이션 분기 + Coston2 배포 (PriceTriggeredSafe 기반이면 빠름)
2. Volatility Incentive `offerIncentive` (구현 작고 차별화 큼, 우선순위 높음)
3. FDC 유출방어 (되면 verifyWeb2Json 실구현, 안 되면 인터페이스+로드맵)
4. Phase 2 자동 에스컬레이션(API/listener) — 로드맵 기본
5. FCC/TEE (바운티②) — 최소 "TEE 조각 1개 실동작", 안 하면 로드맵
6. FAssets/Smart Accounts — 로드맵

---

## 10. 우리가 정할 것 (외부 자료 아님, 코드 중 확정)

- [ ] 액션 enum 최종 (search_protocol_actions 결과 + AssetVault 패턴에서)
- [ ] MVP 감시 범위 (KH=Aave v3 유력 / Flare=담보볼트)
- [ ] 데모 시나리오 자산·상황 (급락 연출 방법)
- [ ] 두 마감 타임존 최종 확인 (제출 페이지 로컬 표시)
- [ ] **★ Safe + Zodiac Roles 채택 여부** (8/6 신규)
  - 찬성: 우리 핵심 원칙 "LLM 출력을 사전정의 enum으로 제한"을 **온체인에서 강제**하는 물건이다.
    함수·인자 화이트리스트 + 토큰별 지출 한도 = "AI가 폭주해도 허용된 액션만 나간다"를 코드로 증명.
    KeeperHub surfaces 점수·안전성 서사 양쪽에 크게 기여.
  - 반대: 가스 스폰서십과 배타. 배포·정책 설정 공수. Safe에 별도 자금 충전 필요(EOA는 가스, Safe는 토큰).
    owner-bypass 때문에 "보안 경계"로는 못 판다.
  - 판단 기준: 첫 tx(★분수령) 통과 후 남는 시간. 스코프 밸브 상 Marketplace 등록보다 우선순위 높다고 봄.
- [ ] 스폰서십 vs private routing 택일 (Reliability 서사를 어느 쪽으로 짤지)

---

## 11. CTC 버전 예고 — 🟣 (8/13 이후)

- 검증 레이어: FDC/FTSO → Attestcoin. "검증된 입력→제한된 출력(enum)" 게이팅이 AI 트랙 정의와 정합
- 마감 9/6, 새 레포 재구축(원저작 조항). 상위 3팀 CEIP 투자 패스트트랙 → 덱을 미니 투자덱 수준
