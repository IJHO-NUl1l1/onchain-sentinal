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

## 0-1. ⭐ 핵심 판단 기준 (Main Flow) — 이 프로젝트가 완성인지 미완성인지의 유일한 기준

> 이 섹션은 8/9 논의로 확정됨. **README를 포함해 이 프로젝트를 설명하는 모든 문서는 이 기준을 중심으로 서술한다.**
> UI 완성도, 대시보드-백엔드 연결, 로그 저장, 영상 퀄리티는 전부 **부수적**이다 — 아래 두 가지가 안 되면
> 나머지가 아무리 매끈해도 미완성이고, 두 가지가 되면 나머지가 부실해도 프로젝트는 완성이다.

**필수 두 가지:**

1. **온체인에서 진짜 데이터를 가져온다** — 지어낸 값이나 가짜 시나리오가 아니라, 지갑의 실제 상태(예: Aave 담보/부채/헬스팩터)를 실제로 체인에서 읽어온다.
2. **그 데이터를 agent(Claude)가 실제로 진단한다** — 가짜 사건을 프롬프트에 지어내 넣는 게 아니라, 1번에서 가져온 **진짜 데이터**를 Claude에게 주고 실제로 판단을 받는다.

이 두 가지가 만드는 게 이 프로젝트의 본질이다: **"AI가 실제 데이터를 보고 실제로 진단했다"**는 사실 자체. 나머지(실행까지 이어지는 배관, UI, 로그)는 이 사실을 뒷받침하는 장식이지 본질이 아니다.

### KeeperHub / Flare의 존재 의의 (이 두 축에 대응)

**1번 축(데이터의 신뢰성) 관점:**
- **Flare(FTSO)** — 가격 데이터가 "어떤 회사 서버"가 아니라 **체인에 내장된 탈중앙 합의**에서 나온다. 데이터 출처 자체가 조작 불가능해진다. 1번 축을 "그럭저럭 되는 것"에서 "누구도 조작 못 하는 것"으로 끌어올리는 역할.
- **KeeperHub** — Aave 헬스팩터 같은 프로토콜 상태를 컨트랙트 ABI 없이도 액션 하나로 바로 조회. 신뢰성보단 **접근성**이 기여점.

**2번 축(진단이 실제 실행으로 이어짐) 관점:**
- 핵심 간극: "AI가 이렇게 해야 한다고 말하는 것"과 "그게 실제로 온체인에서 일어나는 것" 사이엔 큰 차이가 있다. KeeperHub/Flare는 이 간극을 메운다.
- **KeeperHub** — Turnkey가 자동 서명. AI 판단과 실행 사이에 사람도 LLM도 직접 키를 만지지 않는다.
- **Flare** — 한 발 더 나간다. 명백한 케이스는 **LLM 없이 컨트랙트가 스스로 방어**(`checkAndExecute`, 퍼미션리스)하고, 애매한 케이스만 AI 판단을 받되 **화이트리스트된 액션 enum 밖으로는 못 나가게**(`agentRespond`) 강제한다. "판단은 LLM, 실행은 결정론적 인프라"라는 0장 원칙을 컨트랙트 레벨에서 문자 그대로 구현한 것.

**한 줄 요약**: KeeperHub/Flare가 없으면 "AI가 진단했다"는 그냥 말이고, 있으면 그게 취소 불가능한 온체인 사실이 된다.

### 현재 상태 (8/9 기준 — todo.md와 별개로 여기서도 추적)

- [x] **1번 축 완성 (8/9)**: `analyzer.ts`의 `getAaveAccountData()`가 Base Aave v3 Pool에서 실제
      헬스팩터/담보/부채 조회. Pool/USDC 주소는 aave-address-book에서 가져온 뒤 온체인
      `getReservesList()`/`getConfiguration()`으로 직접 대조해 확정(Sepolia 실수 반복 안 함).
      실행 지갑으로 실증: 담보 0, 부채 0, 헬스팩터 uint256 최댓값(Aave의 "부채 없음" 관례) — 진짜 응답.
- [x] **2번 축 첫 실행 (8/9)**: 위 실데이터를 `prompts/diagnoser.md`→`prompts/strategist.md`에
      실제로 태워서 `{severity: "low", diagnosis: "포지션 없음, 위험 없음"}` →
      `{action: "NO_ACTION", rationale: "..."}` 산출. **이 프로젝트 최초로 실제 온체인 데이터 →
      실제 agent 진단 → 실제 액션 결정까지 끝까지 돈 사례.** 위험 없는 상태를 정직하게 "위험 없음"으로
      진단했다는 점이 중요 — 가짜 위기를 지어내지 않음.
      **남은 것**: 실제 포지션이 있을 때(담보 공급 후) medium/high severity 진단도 실제로 나오는지 확인
      (Base에 자금 준비 후 진행)
- [x] **Flare 버전도 두 축 실증 (8/9)** — `SentinelVault.sol`을 Coston2에 배포
      (`0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF`) 후 `setPolicy`/`checkAndExecute` 실행.
      1번 축: 진짜 FTSO FLR/USD 가격을 온체인에서 읽음(호출마다 값이 바뀌는 걸로 확인).
      2번 축: 이번엔 LLM이 아니라 **컨트랙트 자체가** 괴리율 계산해서 판단(정상 → 조용히 통과) —
      Flare는 "명백한 케이스는 LLM 없이 컨트랙트가 판단"하는 구조라 이게 맞는 그림.
      상세는 §3 "SentinelVault.sol 배포 완료" 참조.

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
- ⚠️ **8/9 정정**: `PriceTriggeredSafe`/`AssetVault`라는 이름의 예제는 현재 `flare-hardhat-starter`에
  실재하지 않음(직접 clone해서 확인, 8/9) — 옛 버전 스타터 기준이었거나 잘못 기억된 참조로 보임.
  실제로 쓴 레퍼런스는 스타터의 `boringVault/oracles/FTSOv2RateProvider.sol`(FTSO 호출 패턴)이고,
  나머지 정책 저장/즉시방어/에스컬레이션 로직은 architecture.md §4 라이프사이클을 직접 코드로 옮김.
  실제 구현은 `contracts/contracts/SentinelVault.sol` 참조.
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

**⚠️ 8/9 실증: Aave v3 액션은 Sepolia를 지원하지 않는다.** KeeperHub Aave V3 플러그인 문서(사용자 제공)에 명시:
"Supported chains: Ethereum, Base, Arbitrum, Optimism" — Sepolia 없음. `network: "11155111"`로 호출하면
에러 없이 받아들여지고 실제 존재하는 Pool 주소(`0x6Ae43d...`, aave-address-book과 일치)로 tx까지 만들어지는데,
`supply()` 자체가 원인 불명의 빈 revert로 실패한다 — 근본 원인은 "지원 안 되는 체인에서 억지로 시도"였다.
**Aave 라이브 검증은 Ethereum/Base/Arbitrum/Optimism 중 하나(Base 권장 — 저가스)에서 해야 한다.**
Aave v4는 대안이 아니다 — Ethereum 메인넷만 지원(L2 없음), 그것도 "Lido Spoke" 하나뿐이라 스테이블코인
자산 자체가 없을 수 있고, `reserveId` 해석 단계까지 추가로 필요해서 v3보다 나쁜 선택.

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
11. `execute_protocol_action`의 응답은 MCP `isError`가 아니라 **`content[0].text` 안의 JSON `{success, error}`로 실패를 알려준다** — `isError`만 보면 실패를 성공으로 오인함(8/9 실증, app/executors/keeperhub.ts의 `toTxResult` 참조)
12. `web3/approve-token`은 **`execute_protocol_action`(직접 실행)을 지원 안 함** — "Direct execution not supported... Use workflow execution instead" 에러. 워크플로우로 만들어서 `execute_workflow`로 실행해야 함
13. `aave-v3/supply`는 `referralCode`가 스키마상 optional인데 **실제로는 없으면 거부됨**("referralCode: uint16 is missing"). `"0"` 기본값 필요

**⚠️ 8/10 정정 — 안전 절차가 적용되는 툴은 한정적이다:**
아래 simulate/idempotency_key 절차는 **"직접 실행" 툴 3종 전용**이다 —
`execute_transfer` / `execute_contract_call` / `execute_check_and_execute`.
(`get_direct_execution_status` 설명이 이 셋만 명시한다.)
- **`execute_protocol_action`에는 `simulate`도 `idempotency_key`도 없다.** 스키마가 `actionType` + `params`뿐이고
  실행 상태 폴링 대상도 아니다. 우리 `KeeperHubExecutor.execute()`가 이 툴을 쓰므로 **시뮬레이션 없이 바로 나간다.**
- 시뮬레이션·멱등성·감사 폴링이 필요하면 `execute_check_and_execute`로 가야 한다(원시 ABI/`function_args` 필요).
  그쪽은 "읽고-판단-실행 한방"이라 우리 제품과 궁합이 좋지만, `abi`·`function_args` 문자열화 함정을 다시 만난다.

**직접 실행 안전 절차 (위 3종 툴 한정, 반드시 이 순서):**
1. `simulate: true`로 먼저 실행
2. `success === true` **그리고** `wouldRevert === false`일 때만 진행 (툴 에러면 즉시 중단)
3. 동일 인자 + `idempotency_key`로 재호출
4. `get_direct_execution_status`를 백오프 폴링 → 최종 `transactionLink`를 온체인 증빙으로 보관

**체인 ID 전체 목록:** `list_action_schemas`에 `includeChains: true`

**체인:** 개발 Sepolia(11155111)/Base Sepolia(84532). USDC 주소·파우셋은 Quickstart 참조.
- 8/6 정정: **테스트넷도 가스 스폰서십 대상이고 크레딧을 안 먹는다.** "제출 tx는 반드시 mainnet"이 아니다.
  메인넷 tx는 심사 임팩트가 크지만 크레딧을 소모하므로, 개발·리허설은 테스트넷 / 제출용 1~2건만 메인넷을 권장.
- **Sepolia 권장**: 스폰서십 + Safe 둘 다 지원되는 유일한 테스트넷 (Base Sepolia는 Safe 미지원).
  ⚠️ **단, 전송·스폰서십 한정.** Aave v3 액션은 Sepolia 미지원이라(위 참조) **Aave 데모는 Base(8453)**.
  8/10 결정: 데모는 Base 메인넷으로 확정, Sepolia 폴백은 폐기.

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

**✅ SentinelVault.sol 배포 완료 (8/9, Coston2):**
- 주소: `0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF` — 제출물 "smart contract address"란에 이 값
- agent(`agentRespond` 화이트리스트): `0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c`
- 익스플로러: https://coston2-explorer.flare.network/address/0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF
- `eth_getCode`로 실제 bytecode 존재 확인(빈 응답 아님)

**✅ §0-1 두 축 Flare 버전 실증 완료 (8/9):** `npm run demo:coston2`(contracts/) —
`setPolicy(FLR/USD, 5%)` → 실제 FTSO 가격을 anchorPrice로 기록(여러 번 실행할 때마다
607524→607991→608025 등으로 계속 바뀜, 살아있는 데이터 확인) → `checkAndExecute` 실행 →
정상 상태에서 `isLocked: false`로 조용히 통과. **KeeperHub 쪽과 마찬가지로 Flare에서도
"진짜 온체인 데이터 → 컨트랙트가 직접 판단"까지 실증됨.**

**⚠️ 함정(8/9 실증): `checkAndExecute` 가스 자동 견적이 불안정하다.** FLR/USD 같은 FTSOv2
Block Latency Feed는 매 블록(~1.8초)마다 갱신되는데, ethers의 자동 gas estimate 시점과
실제 채굴 시점 사이에 가격이 바뀌면 더 비싼 코드 경로(SSTORE 등)를 타면서 견적이 빗나가
**사유 없는 revert(out-of-gas)**가 난다. `tx.gas === receipt.gasUsed`로 확인 가능.
→ **시간에 민감한 FTSO 기반 함수 호출은 항상 명시적 `gasLimit`을 줄 것** (KeeperHub의
"시간민감 트리거는 보수 배수" 함정과 같은 종류). `contracts/scripts/demo-provision-and-check.ts` 참조.

**★ Volatility Incentive (킬러 기능):**
- 컨트랙트 `FastUpdateIncentiveManager` (인터페이스 `IFastUpdateIncentiveManager`, ContractRegistry로 조회)
- `getCurrentSampleSizeIncreasePrice()` → 현재 가속 비용 / `offerIncentive({rangeIncrease,rangeLimit})` payable → 가속
- 1회 = 8블록 지속. "AI가 급변 감지 → offerIncentive로 오라클 가속"

**FDC (스코프 밸브):**
- `ContractRegistry.getFdcVerification().verifyWeb2Json(proof)` 패턴
- 흐름: 요청 → 라운드 파이널 대기 → DA Layer에서 증명 fetch → 컨트랙트 제출·검증 (분 단위)
- env: `VERIFIER_URL_TESTNET`, `VERIFIER_API_KEY_TESTNET`, `COSTON2_DA_LAYER_URL`

**키퍼:** 컨트랙트는 스스로 안 깨어남. `checkAndExecute()`를 퍼미션리스로 열고 단순 cron 봇이 주기 호출 (Flare 표준 패턴 = adapter의 `refresh()`/`checkMarketVolatility()`).

**레퍼런스 구현**: `PriceTriggeredSafe`/`AssetVault`는 현재 스타터에 없는 걸로 확인됨(§2 8/9 정정 참조).
대신 `boringVault/oracles/FTSOv2RateProvider.sol`의 FTSO 호출 패턴을 참고해 `SentinelVault.sol` 직접 작성.

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
| 온체인 실행 | Phase1 즉시실행 + Phase2 대응 ⚠️ 증빙은 **tx 해시 링크**로 (지갑 주소 목록엔 안 뜬다 — 3장 참조) |
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

**8/6 개정, 8/9 갱신.** 원안(D1=8/2, 14일 계획) 대비 8/6 시점에 3~4일 지연이 있었으나,
아래 D3-5 압축안대로 Phase A·B를 8/9에 마쳐 흡수했다 (진행상황은 docs/todo.md).

```
8/6(목)  ★첫 tx 뚫기: Sepolia 파우셋 → execute_transfer simulate → 실행 → transactionHash
         + 레포 구조 결정(코드 쓰기 전 필수) — 완료
8/7-8/9  🟢 공유 뼈대: Executor 인터페이스 / analyzer·diagnoser·strategist / 액션 enum 확정
         대시보드는 "실행 증명"에 필요한 최소한만. 여기서 화려함을 좇으면 전체가 무너진다 — 완료
8/9-8/10 🔵 KeeperHub Phase0(지갑 분석 → create_workflow 자동 생성) + Phase2 반자동 데모 — 완료
8/11-8/12 🔵 영상·README·제출 준비 ▷ 병렬: 🟠 SentinelVault.sol 착수 — Vault는 8/9에 조기 완료
8/13 19:00 🔵 KeeperHub 제출 → 이후 전부 Flare
~8/15 04:59 🟠 Vault·FTSO·Coston2 배포 + FlareExecutor + 영상/서면/제출
```

### 8-1. ⭐ 제출물 구성 개정 (8/10 확정)

**배경**: 기술 코어는 두 트랙 다 §0-1 두 축을 통과했다. 남은 리스크는 기능이 아니라 **제출물**
(영상·README 두 트랙 다 0%). 아래는 그 제출을 어떻게 포장할지의 결정이다.

**⚠️ 결정적 제약 — 심사 기간과 Flare 빌드 기간이 겹친다:**
KeeperHub 심사는 **8/13-8/20**, Flare 마감은 **8/15**. 즉 Flare 작업 전체가 KeeperHub 심사 창 안에 있다.
같은 브랜치로 두면 심사위원이 언제 열든 무관한 컨트랙트 커밋이 계속 쌓이고, 최악엔 중간 파손 상태를 본다.
**심사 시점을 통제할 수 없으므로 제출한 상태가 그대로 얼어 있어야 한다.**

**결정: 레포는 하나, 제출은 브랜치로 동결한다.**

```
main                    ← 계속 개발. README는 짧은 안내판(두 트랙 갈림길)
├─ submission/keeperhub ← 8/13 제출 직전 분기. 루트 README = KeeperHub 전용. 이후 불변
└─ submission/flare     ← 8/15 제출 직전 분기. 루트 README = Flare 전용. 이후 불변
```

- 제출 폼에는 브랜치 URL(`/tree/submission/keeperhub`)을 넣는다. GitHub이 그 브랜치의 README를 렌더링하므로
  **브랜치마다 루트 README가 다르다** → 두 심사위원이 각자 트랙에 맞춰진 문서만 본다.
- 각 브랜치에 태그도 같이 박아 되돌릴 수 없게 한다.
- ~~"루트 README 하나에 트랙별 섹션 + 앵커"~~ 안은 폐기(8/10). 심사위원은 스캔하듯 읽어서 어느 쪽도 안 읽힌다.

**레포를 쪼개지 않는 이유**: 각 레포에 executor 구현이 하나만 남으면 `Executor` 인터페이스가
**구현체 1개짜리 추상화**가 되어 과설계로 보인다. "판단은 LLM, 실행은 결정론적 인프라 —
그래서 실행 엔진을 갈아끼울 수 있다"는 핵심 주장이 코드로 증명되지 않는다. 공유 코드 이중 관리 부담도 크다.
- **쪼개야 하는 예외 2가지**: ①규정이 "대회 전용 레포"를 명시적으로 요구 ②제출 폼이 브랜치 URL을 안 받음
  → [ ] **제출 폼 확인 필요(사용자)**. CTC(9/6)는 원저작 조항 때문에 어차피 새 레포다(§11).

**⚠️ 순서 개정 — `FlareExecutor`를 KeeperHub 제출 *전에* 뚫는다:**
`submission/keeperhub`를 동결하면 그 시점 코드가 8/20까지 심사 대상으로 고정된다.
그때 `FlareExecutor`가 `throw` 스텁이면 KeeperHub 심사위원은 구현체 1개짜리 인터페이스를 보게 되고,
나중에 `main`에서 구현해도 **심사본에는 영원히 반영되지 않는다.** 몇 시간짜리 작업으로
"실행 엔진 두 개를 실제로 갈아끼운다"를 심사본에 넣을 수 있다.

```
8/10(월) 🟢 FlareExecutor 구현(setPolicy/agentRespond, 명시적 gasLimit 필수)
         + register-wallet.ts의 KeeperHubExecutor 하드코딩 → executor 선택으로 교체
         ↑ CLAUDE.md "Executor 경계" 위반 해소 + 아키텍처 주장을 코드로 증명
         이어서 README 공통 골격 + 🔵 KeeperHub 버전
8/11-8/12 🔵 데모 영상 촬영 → submission/keeperhub 동결 → **마감 기다리지 말고 제출**
8/13 19:00 🔵 KeeperHub 마감 (이미 제출 완료 상태여야)
8/13-8/15 🟠 Flare README + 영상, 여유 시 offerIncentive → submission/flare 동결 → 제출
```

### 8-2. 🔵 KeeperHub 데모 시나리오 확정 (8/10, 공식 공고 기준)

**공고가 요구하는 것 (인용):** *"We reward agents that execute onchain, a working transaction that
executes through KeeperHub beats a polished demo that never touches a chain."*
→ **실행이 최우선 가중치.** 제출물 3종: ①GitHub ②agent가 온체인 실행하는 데모 영상 ③실행한 tx 링크.

**우리 컨셉과의 정합:** 공고의 프레이밍이 *"Agents can think, KeeperHub lets them act"* — 우리 §0장
"판단(LLM)과 실행(결정론적 인프라)의 분리"와 **같은 말이다.** README·영상은 이 언어를 그대로 쓴다.

**포지션 설계 (8/10 확정): WETH 담보 + USDC 차입, Base 메인넷.**
~~USDC 담보 + USDC 차입~~ 안은 폐기 — 같은 자산 담보/차입은 현실의 DeFi 포지션이 아니라
"실사용성" 심사에서 불리하고, 허용 여부도 불확실했다. WETH담보/USDC차입은 가장 전형적인 형태이고
온체인 조회로 **둘 다 isolation·siloed 아님**이 확인돼 제약이 없다.

**목표 HF는 2.0** (정책 임계값 2.5). 근거:
- HF 2.0에서 청산되려면 **ETH가 50% 빠져야** 한다 → 촬영 대기 중 청산 사고 없음
- 동시에 2.0은 실제 사용자들이 운용하는 현실적 구간이라 심사위원에게 자연스럽다
  (HF 3~4 + 임계값 4는 안전하지만 "위험하지도 않은 걸 위험하다 한다"로 읽힐 수 있다)
- 방어 후 **4.0**으로 올라가는 그림 → 영상에서 변화가 뚜렷하다

**금액 (담보가치 C 기준, WETH 청산임계값 0.83):**
- 차입 = `0.83·C / 2.0` = **0.415·C** → HF 2.0
- 방어 = 부채의 **절반 상환**(0.207·C) → HF 4.0
- ⚠️ **빌린 USDC가 그대로 지갑에 남으므로 방어용 실탄을 따로 살 필요가 없다.** 상환은 빌린 돈을 도로 갚는 것

**준비 절차 (전부 화면 밖):**
1. 실행 지갑 `0x2b33…BcE3`에 **WETH** + 가스용 Base ETH 소액
   (경로: 업비트 → 개인 지갑 → 실행 지갑. 거래소에서 실행 지갑으로 직접 보내지 말 것)
2. Pool에 WETH approve → `aave-v3/supply` (담보 공급)
3. `aave-v3/borrow` USDC = 0.415·C → HF 2.0 착지
4. Pool에 USDC approve (나중 상환용)
- ⚠️ HF는 매 단계 `aave-v3/get-user-account-data`로 **실측**할 것. 계산값을 믿지 말 것. **1.0 밑은 청산**
- ⚠️ 위 2~4는 **전부 KeeperHub를 통해야 한다** (실행 지갑은 KeeperHub만 서명 가능) — 아래 미검증 목록 E 참조

**⚠️ Aave 공식 Pool 문서 대조로 나온 선행조건 (8/10) — 빠뜨리면 3막이 카메라 앞에서 실패한다:**

1. **`KEEPERHUB_DEV_CHAIN_ID`를 `8453`(Base)으로 바꿔야 한다.**
   `executors/keeperhub.ts`의 기본값이 `"11155111"`(Sepolia)이다. 안 바꾸면 **Aave가 지원 안 되는
   Sepolia로 조용히 나가서** 8/9에 몇 시간 태운 그 실패를 그대로 반복한다. `app/.env`에 명시할 것.
2. **`supply` 전에 ERC20 `approve()`가 필요하다.** 공식 문서: *"the Pool contract must have allowance()
   to spend funds on behalf of msg.sender"*. `repay`도 마찬가지다.
   기존 `sentinel-approve-usdc-pool` 워크플로우는 **Sepolia 주소**라 못 쓴다 — Base Pool/USDC로 새로 해야 한다.
   USDC 하나에 max approve 한 번이면 supply·repay 둘 다 커버된다.
3. **`interestRateMode`는 `2`(variable)를 명시적으로 넘긴다.** 공식 문서가 "should always be passed 2"라고
   못박았고 stable 모드는 폐기됐다. KeeperHub에선 optional 필드라 기본값을 신뢰하지 말 것.
   `referralCode`는 `0`(referral 프로그램 비활성) — 우리 §3 함정 13번과 일치.

**✅ 확정 — Base Aave v3 리저브 (8/10, 온체인 직접 조회. `app/scripts/check-base-reserve.ts`)**
`Pool.getReservesList()`로 리저브 목록을 받고 `Pool.getConfiguration()` 비트맵을 디코딩한 값이다.
문서 인용이 아니라 체인이 답한 값 — 가정 A의 대부분이 여기서 해소됐다.

| | WETH (담보) | USDC (부채) |
|---|---|---|
| 주소 | `0x4200000000000000000000000000000000000006` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| decimals | **18** | **6** |
| LTV | 80% | 75% |
| **청산 임계값** | **83%** | 78% |
| 청산 보너스 | 105% | 105% |
| borrowing enabled | true | **true** |
| siloed / isolation | false / false | false / false |
| active·frozen·paused | true / false / false | true / false / false |
| borrow cap / supply cap | 143,000 / 169,000 | 207,000,000 / 230,000,000 |

- Base Aave v3 Pool `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` (`analyzer.ts`에서 실사용)
- **둘 다 isolation/siloed가 아니다** → WETH 담보 + USDC 차입 조합에 제약 없음
- ⚠️ 금액은 base unit으로 넘긴다: USDC 10개 = `"10000000"`, WETH 0.01개 = `"10000000000000000"`

**HF 계산식:** `HF = (담보USD × 청산임계값) / 부채USD`. WETH 담보면 임계값 0.83이다.
- 담보가치 C에 대해 부채 D를 잡으면 `HF = 0.83·C / D`
- LTV 80% 상한이라 최대 차입은 `D ≤ 0.8·C` → 이때 HF ≈ 1.04 (즉 최대로 빌리면 청산 문턱)
- 목표 HF에서 역산: `D = 0.83·C / 목표HF`

**그 외 문서에서 확인된 것 (우리 구현과 일치):**
- `getUserAccountData` 반환 6개(담보/부채/여력/청산임계값/LTV/HF)가 `analyzer.ts` 디코딩과 정확히 일치.
  base currency는 가격피드 기준(8자리 소수), HF는 18자리 — 우리 포맷터가 쓰는 값과 같다
- 부채가 있으면 **HF가 1 밑으로 내려가는 만큼은 `withdraw`가 막힌다** → 재촬영 리셋 시 부분 인출만 가능
  (전액은 `type(uint256).max`이지만 부채가 남아 있으면 거부된다)
- 청산은 HF < 1에서 발생하고 close factor 0.5 — 한 번에 최대 50%까지 청산된다

**5막 구성 (3~4분):**

| 막 | 보여줄 것 | 대응하는 심사 기준 |
|---|---|---|
| 1. 배치 | 대시보드에 주소 입력 → analyzer가 Base Aave 실데이터 조회 → `create_workflow`로 감시망 자동 생성. KeeperHub UI에 워크플로우가 실제로 생긴 걸 보여준다 | Use of KeeperHub surfaces (MCP, workflow builder) |
| 2. 진단 | 실측 HF(≈2.0, 정책 임계값 2.5)를 `prompts/diagnoser.md`→`strategist.md`에 태워 `{severity}` → `{action:"REPAY_DEBT"}`. **출력이 액션 enum 밖으로 못 나간다**는 점을 명시 | Originality / 안전성 서사 |
| 3. 실행 ★ | `execute_protocol_action`으로 `aave-v3/repay`(부채의 절반) 실행 → 응답의 tx 링크. Turnkey가 서명 — 사람 키도 메타마스크 팝업도 없다 | **Does it execute onchain (최고 가중치)** |
| 4. 검증 | BaseScan에서 tx 해시 열기. 스폰서 형태(From=릴레이어, Value=0)면 **설명하면서** Internal Transactions 탭으로 실제 호출을 보여준다(스폰서 미적용이면 From=우리 지갑 — 둘 다 정상). 이어서 HF 재조회 → **2.0 → 4.0으로 실제 회복** | 실행 증명 |
| 5. 관측 | KeeperHub audit trail: trigger / simulation result / submitted tx / gas used / outcome / timestamp | Reliability and observability |

**차별화 대사 (공고의 심사 기준 4번용) — ⚠️ 8/10 재조정:**
`search_templates` 실사 결과, 공개 템플릿에 `Aave V3 Health Factor Guardian`뿐 아니라
**`Aave V3 Auto-Repay on Low Health`**, `Aave V3 Leveraged Position Liquidation Guard (Base)`,
`Aave V3 wstETH Position Health Monitor + Auto-Repay`가 **이미 있다.**
→ **"우리는 자동으로 방어한다"는 차별화가 아니다.** 그건 기성 템플릿이 이미 한다. 이 대사로 가면
   심사위원이 "템플릿으로 되는 걸 만들었네"라고 읽는다.

**진짜 차별점은 실행이 아니라 그 앞단 두 개다:**
1. **감시망을 사람이 고르지 않는다.** 템플릿은 사람이 자산·임계값(1.5 등)을 채워 넣는 정적 폼이다.
   우리는 지갑을 실제로 조회해 상태를 보고 **감시망을 매번 새로 설계·생성**한다
   (증거: 서로 다른 두 주소로 실제 생성된 `sentinel-0x2b33…` / `sentinel-0x6Bc68c…`).
2. **대응을 규칙이 아니라 LLM이 판단하되, 액션 enum 밖으로 못 나간다.** 템플릿의 auto-repay는
   `if HF < 1.5 then repay` 고정 규칙이다. 우리는 실데이터를 LLM에 태워 진단을 받고, 그 출력이
   사전정의 enum으로 제한된다 — §0장 "판단은 LLM, 실행은 결정론적 인프라"의 구현.

**재촬영 대비:** `provisionMonitoring`은 `idempotency_key = provision-<주소>`라 여러 번 돌려도
워크플로우가 안 쌓인다. 3막을 다시 찍으려면 `aave-v3/withdraw`로 담보를 빼 HF를 다시 떨어뜨리면 된다.

**❓ 미검증 목록 (8/10 갱신) — 공식 문서 근거 없이 추론·경험으로 채운 것 전부.**
데이터뿐 아니라 **코드가 추측 위에 서 있는 부분**까지 포함한다. 시나리오는 WETH담보/USDC차입·Base 확정,
Sepolia 폴백은 폐기됨.

*A. Aave 시장 파라미터 — ✅ 8/10 해소됨*
온체인 `getReservesList`/`getConfiguration` 직접 조회로 확정(위 표). 주소·decimals·청산임계값·
isolation/siloed 여부 전부 확인. **더 이상 추측 아님.**

*B. 코드가 공식 스키마 없이 추론으로 채워진 부분 — 문서화된 근거가 없다*
- [ ] `create_workflow`의 node/edge 구조 전체. `keeperhub.ts` 주석대로 **기존 워크플로우를
      `list_workflows`로 조회해 형태를 베낀 것**이지 공식 스키마 문서를 본 게 아니다
      (`position`, `data.status`, edge 형태 모두 역공학 결과)
- [ ] `_protocolMeta` 의 내용물. 베껴 넣었을 뿐 **무슨 역할인지, 필수인지 모른다**
- [ ] `create_workflow`가 `idempotency_key`를 실제로 존중하는지. 중복이 안 쌓이는 건 봤지만
      **이름이 같아서일 수도** 있다 (스키마에 있는지 미확인)
- [ ] `onBehalfOf`/`to`/`interestRateMode`를 KeeperHub의 `aave-v3/*` 액션이 그 형태로 받는지.
      Aave 문서로 "무엇이 필요한지"는 확정했지만 **KeeperHub가 그 키를 그대로 받는지는 미검증**
- [ ] `toTxResult`가 읽는 `body.transactionLink` — **protocol action 응답에 이 필드가 있는지 모른다**
- [ ] `body.success` 기반 성공 판정 — 8/9에 관측한 에러 응답 하나에서 역추론한 규칙
- [ ] `LOCK_POSITION → aave-v3/withdraw` "전액 인출로 흉내"는 **우리가 지어낸 의미 부여**.
      `amount`(= uint256 max) 기본값도 없어 **지금 상태로는 호출 자체가 안 된다**
- [ ] `analyzer.ts`의 base currency 8자리 / HF 18자리 소수 가정. Aave Pool 문서에 자릿수 명시가 없다.
      **실제 포지션이 생기면 그때 실측으로 확정할 것**

*C. KeeperHub 동작 가정 — 데모 막별로 직결*
- [ ] `execute_protocol_action` 응답에 tx 링크가 오는가 → **3막의 결과물**
- [ ] MCP로 직접 실행한 protocol action이 **audit trail에 남는가** → **5막 전체**
- [ ] Base 메인넷 가스 크레딧 잔여 → 스폰서 형태냐 자기지갑 형태냐 → **4막 대사**
- [ ] `web3/approve-token`이 Base에서 동작하는지·파라미터 형태 (`list_action_schemas`로 확인 가능)

*D. Aave 동작 가정 — A 이후 남은 것*
- [ ] **WETH를 supply하면 자동으로 담보로 잡히는가.** 안 잡히면 HF가 무한대로 남아 **데모가 성립하지 않는다.**
      `setUserUseReserveAsCollateral`로 켜야 할 수도 있다 ← D에서 가장 위험
- [ ] 부분 `repay`가 우리가 연 부채(variable, mode 2)에 그대로 먹히는가

*E. 셋업 실행 자체가 미검증 — ⚠️ 놓치기 쉬운 구조적 문제*
포지션은 **실행 지갑 이름으로** 만들어야 하는데 그 지갑은 KeeperHub만 서명할 수 있다.
즉 Aave UI로 못 하고 **approve·supply·borrow 세 건 모두 KeeperHub를 통해야 한다.**
- [ ] `aave-v3/borrow`는 우리 액션 enum에 **의도적으로 없다**(방어 에이전트가 빌릴 이유가 없어서).
      셋업용 차입은 **MCP를 손으로 호출**해서 해야 한다 — 경로·인자 미검증
- [ ] **WETH를 실행 지갑에 어떻게 넣는가.** Aave는 ETH가 아니라 WETH 토큰을 받는다.
      거래소에서 WETH로 직접 출금이 되는지, 아니면 ETH를 받아 wrap해야 하는지(=`WETH.deposit()` 호출),
      wrap을 KeeperHub로 어떻게 하는지 전부 미확인 ← **자금 경로의 실질적 첫 관문**
- [ ] 업비트의 Base 네트워크 출금 지원 여부·수수료
- [ ] "거래소가 delegation 코드 있는 주소로의 출금을 거부한다"는 것도 **내 추측**이다(개인 지갑 경유로 회피)

*F. 에이전트 판단 — 한 번도 위험 상황을 본 적이 없다*
- [ ] HF 2.0 / 정책 2.5에서 diagnoser가 실제로 medium·high를 내는가
- [ ] strategist가 `NO_ACTION`이 아니라 `REPAY_DEBT`(또는 `SUPPLY_COLLATERAL`)를 고르는가
      → 프롬프트는 우리 것이라 조정 가능하지만 **아직 한 번도 안 돌려봤다**

*G. 제출 절차*
- [ ] 제출 폼이 브랜치 URL을 받는가 (§8-1 단일 레포 결정의 전제)
- [ ] 바운티 제출 방식(별도 폼인지 BUIDL 첨부인지)
- [ ] 같은 레포를 두 해커톤에 내는 게 규정상 허용되는가

*H. 문서 정합성 (우리가 고칠 것)*
- [ ] 이 §8-2 본문이 아직 **USDC담보/USDC차입 + 옛 숫자** 기준이다 → WETH/USDC로 재작성 필요
- [ ] §3의 "Sepolia 권장"(8/6, 스폰서십+Safe 기준)이 Base 확정과 어긋나 보인다 → 단서 필요

*I. 폴백이 없어졌다 (8/10, Sepolia 제외 결정)*
자금이 안 오면 Aave 실행 장면 자체가 불가능하고, 남는 실행 증거는 8/8의 단순 전송 tx 하나뿐이다.
- [ ] **자금 도착 데드라인과 그때의 대체안을 미리 정할 것** (촬영 당일에 정하면 늦다)

---


**💰 바운티(별도 $1,000, Grand Prize와 중복 수상 가능) — 놓치지 말 것:**
"Best Onboarding UX Improvement … **a clear teardown of where you got stuck with proposed fixes**".
우리는 이미 그 teardown을 갖고 있다 — §3 함정 목록 13개(`abi` 문자열화, `simulate` 불리언,
`idempotency_key`, EIP-55 체크섬, `referralCode` 누락, 중첩 success/error 파싱, `app/.env` 위치,
**Aave v3가 Sepolia에서 조용히 실패하는 것**, 가스 견적 불안정 등)는 전부 실제로 막혔던 지점과
해결책이다. 이걸 영어로 정리해 별도 제출하면 **거의 추가 비용 없이 바운티 후보**가 된다.
- [ ] 함정 목록 → 영문 teardown 문서로 정리 (KeeperHub 레포 PR 또는 제출물 첨부)

**정직성 체크(영상 촬영 전 필독):**
- `log-table.tsx`는 아직 **목업 데이터**다. 실제 로그인 것처럼 비추지 마라 — 패널을 빼고 찍거나 "샘플" 명시.
- `FlareExecutor` 미구현 상태로 "실행 엔진 2개 추상화"를 README에 쓰면 과장이다. 구현하거나 정확히 서술할 것.
- 스폰서 tx는 지갑 주소 거래목록에 안 뜬다 → **tx 해시 → Internal Transactions 탭**으로 촬영(§3).

효율 3원칙: ①두뇌 먼저 손은 어댑터로 ②KH 완성도 몰빵, Flare 스코프밸브 준비 ③문서도 코드처럼 파생. ⚠️ 34h는 마무리·배포용, contract는 8/11 병렬착수로 이미 절반 진행 상태여야.

**🔵 KeeperHub 스코프 밸브 (신규 — 원안은 KH를 밸브 없이 몰빵이었으나 지연으로 필요해짐):**
- 버리는 순서: ①Marketplace 등록 ②Safe+Zodiac ③대시보드 시각적 완성도
- **무슨 일이 있어도 사수**: 첫 tx / Phase0 자동 생성 데모 / tx 해시 증빙
  ↑ 이 셋이 "AI가 감시망을 설계해 배치하고 온체인에서 실행했다"는 주장의 전부다

---

## 9. 스코프 밸브 (Flare, 밀릴 때 버리는 순서)

1. **최소 성립선(사수)**: FtsoV2 피드 조회 + 즉시방어/에스컬레이션 분기 + Coston2 배포 — 코드는 작성 완료
   (`contracts/contracts/SentinelVault.sol`, 8/9), 배포만 남음
2. Volatility Incentive `offerIncentive` (구현 작고 차별화 큼, 우선순위 높음)
3. FDC 유출방어 (되면 verifyWeb2Json 실구현, 안 되면 인터페이스+로드맵)
4. Phase 2 자동 에스컬레이션(API/listener) — 로드맵 기본
5. FCC/TEE (바운티②) — 최소 "TEE 조각 1개 실동작", 안 하면 로드맵
6. FAssets/Smart Accounts — 로드맵

---

## 10. 우리가 정할 것 (외부 자료 아님, 코드 중 확정)

- [x] **액션 enum 확정 (8/9)** — KeeperHub `search_protocol_actions(protocol: "aave-v3")` 실사(7개 액션) +
  AssetVault 패턴(deposit/borrow/repay/withdraw+LTV) 대조. `borrow`/`set-collateral`은 방어용 에이전트가
  쓸 이유가 없어 제외. 코드: `app/executors/types.ts`의 `ActionType`.

  | 추상 액션 | KeeperHubExecutor | FlareExecutor |
  |---|---|---|
  | `NO_ACTION` | 없음(로그만) | 없음(로그만) |
  | `INCREASE_MONITORING` | 워크플로우 스케줄 단축 등 | 없음(로드맵) |
  | `SUPPLY_COLLATERAL` | `aave-v3/supply` | `AssetVault.deposit()` |
  | `WITHDRAW_COLLATERAL` | `aave-v3/withdraw` | `AssetVault.withdraw()` |
  | `REPAY_DEBT` | `aave-v3/repay` | `AssetVault.repay()` |
  | `LOCK_POSITION` | (전액 인출로 흉내) | `isLocked` 설정 (PriceTriggeredSafe) |
  | `ACCELERATE_ORACLE` | 해당 없음 | `offerIncentive()` (Volatility Incentive, Flare 전용) |
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
