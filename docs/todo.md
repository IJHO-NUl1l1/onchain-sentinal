# todo.md — Sentinel 진행 상황

> "지금 어디까지 됐는지"를 추적한다. 두 기기(집 랩탑 / 회사 데스크탑)가 이 파일로 동기화한다.
> 작업을 끝내면 해당 항목을 체크하고 커밋하라. 세션 시작 시 이 파일을 먼저 읽어라.
>
> 상태 표기: `[ ]` 미착수 / `[~]` 진행중 / `[x]` 완료
> 각 항목에 담당 기기와 날짜를 남기면 좋다. 예: `[x] ... (데스크탑, 8/6)`
>
> 새 기기 세팅(clone·Node·MCP·`.env`)은 `/CLAUDE.md`의 "두 기기 개발" 참조.

---

## 마감 · 현재 위치

- 🔵 KeeperHub: **8/13 19:00 KST 확정** (공식 타임라인 UTC+2 12:00 → KST 변환, 8/9 확인.
  등록·BUIDL 제출 마감. 이후 8/13-20 심사, 8/17-19 결선 발표, 8/20 수상자 발표)
- 🟠 Flare: **8/15 04:59** (간극 약 34h)
- 🟣 CTC: 9/6 (8/13 이후 착수)

**8/9 기준: Phase A·B 완료, Phase C·D 동시 진행중.** 원안 대비 있었던 3~4일 지연(8/6 시점)은 Phase B를
8/7-8/9로 압축해 흡수했다 — 개정 일정은 architecture.md 8장 참조.

**⏰ 8/11(화) 11:00 현재 — KeeperHub 마감까지 약 2일 8시간, Flare까지 약 4일.**
(마감 = 공고 UTC+2 8/13 12:00 → **KST 8/13 19:00**. "UTC"가 아니라 **UTC+2**라 21:00이 아니다.)
기술 코어는 두 트랙 다 §0-1 두 축을 실증했다. **남은 최대 리스크는 기능이 아니라 제출물이다**
— 영상·README가 두 트랙 다 0%.

**✅ 8/11: Base 메인넷 첫 트랜잭션 성공 — 자금 0원으로.**
`0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6`
approve는 자산을 안 움직이고 `web3/*`라 가스가 대납돼 **빈 지갑으로도** 실행됐다.
→ 공고 제출 요건 *"a transaction your agent executed via KeeperHub"*는 **이미 충족된 상태**다.
   Aave 자금이 끝내 안 와도 제출 자체는 성립한다.

**▶ 다음 작업 순서 (8/11 개정 — 근거·상세는 architecture.md §8-1, §8-2):**
0. **Base 자금 확보 ← 임계경로.** 필요한 건 두 가지뿐:
   - **USDC 30~50달러어치** (담보용)
   - **네이티브 ETH 먼지** — `aave-v3/*`는 스폰서십 대상이 아니라서 필요. 다만 **0.000000231 ETH**면
     충분해 몇십 센트어치로 수십 건 가능. **문제는 금액이 아니라 "0이면 안 된다"는 것**
   - ⚠️ 업비트는 **이더리움 메인넷/솔라나만** 지원 → Base로 못 보낸다. 해외 거래소 경유 또는 온램프 필요
1. `FlareExecutor` 구현 + executor 선택 배선 ← **KeeperHub 제출 전에 끝낼 것**
   (제출 브랜치를 동결하면 그 코드가 8/20까지 심사 대상이라, 스텁이면 영원히 스텁으로 남는다)
2. README 공통 골격 + 🔵 KeeperHub 버전 → 데모 영상 → `submission/keeperhub` 동결 → **조기 제출**
3. 🟠 Flare README + 영상 (+여유 시 `offerIncentive`) → `submission/flare` 동결 → 제출
- `execute()` Base 라이브 검증은 자금 도착 시에만. §0-1 기준 이미 통과라 **스코프밸브 대상**.

**🔒 8/10 확정된 결정 (다시 논의하지 말 것):**
- 데모 포지션 = **WETH 담보 + USDC 차입**, **Base 메인넷(8453)**. 목표 HF 2.0 / 정책 임계값 2.5
- **Sepolia 폴백 폐기.** Aave v3 액션이 Sepolia 미지원이고 테스트넷 우회는 안 하기로 함
  → 자금 도착이 **임계경로**. 안 오면 Aave 실행 장면 자체가 불가능하다
- 제출은 레포 하나 + `submission/*` 브랜치 동결 (§8-1)
- Base 리저브 파라미터·주소·자릿수는 **온체인 조회로 확정 완료** (§8-2 표, `app/scripts/check-base-reserve.ts`)

**❓ 남은 미검증 항목은 architecture.md §8-2 "미검증 목록" 참조** (A는 해소, B~I 남음).
그중 구조적으로 큰 두 가지:
- **셋업(approve·supply·borrow)을 전부 KeeperHub로 해야 한다** — 실행 지갑은 KeeperHub만 서명 가능.
  게다가 `aave-v3/borrow`는 액션 enum에 없어서 **MCP를 손으로 호출**해야 한다
- **Aave는 ETH가 아니라 WETH를 받는다** — 실행 지갑에 WETH를 어떻게 넣을지 미해결(거래소 직접 출금? wrap?)

---

## Phase A — 셋업 & 검증 (D1-2)

- [x] KeeperHub 계정 생성 + Turnkey 지갑 확인
      - [x] 계정 생성 + 온보딩 (8/6, 기기1)
      - [x] 실행 지갑 주소 확보 `0x2b33...BcE3` (8/6) — 주소·integrationId는 architecture.md
      - [x] ✅ `isManaged:false` 규명 완료 (8/6) — 오탐. Turnkey EOA 자동 프로비저닝 지갑이 맞고
            자동 서명 유효. `isManaged`는 Safe 미부착 상태를 뜻함. 상세는 architecture.md
- [x] `claude mcp add` 로 MCP 연결 + `/mcp` OAuth 완료 (8/6, 기기1 — `Connected to keeperhub` 확인)
      - [x] 두 번째 기기(기기2)에서도 등록+OAuth 재실행 완료 (8/8 — `Authentication successful. Connected to keeperhub.`)
- [x] MCP 툴 목록 실사 (`tools_documentation` — 함정 3개 추가 발견, architecture.md 반영, 8/6)
- [x] MCP 툴로 워크플로우 1개 수동 생성 (`create_workflow`, 8/8, 기기2)
      워크플로우 `sentinel-test-manual` (id `acc6sf96s9w63h7rgv8oq`) — Manual 트리거 + `web3/check-balance`.
      `execute_workflow`로 실행 검증까지 완료(mainnet 0.0 ETH 확인 후 Sepolia로 임시 전환해 0.05 ETH도 확인).
- [x] **Sepolia** 파우셋으로 테스트 자산 확보 (8/8, 기기2 — 개인 계정에서 실행 지갑으로 0.05 ETH 전송)
- [x] **첫 트랜잭션 성공** (`execute_transfer` simulate→실행→transactionLink 확보) ★분수령 (8/8, 기기2)
      Sepolia, `0x2b33...BcE3` → `0x6Bc68c...C809c` 0.001 ETH.
      tx: `0x8632b1ae0102eb9815918e3fd4f9d16d6cf94c058fe0d9362100228343e091e9`
      https://sepolia.etherscan.io/tx/0x8632b1ae0102eb9815918e3fd4f9d16d6cf94c058fe0d9362100228343e091e9
      ⚠️ architecture.md 3장 스폰서 tx 패턴 실증됨 — top-level From/To/Value는 릴레이어·컨트랙트·0이고,
      실제 전송은 **Internal Transactions 탭**에 찍힘. 데모 촬영 시 이 화면 그대로 써야 함.
- [x] Coston2 파우셋(C2FLR) 확보 + RPC 연결 확인 (8/8, 기기2 — MetaMask에 Coston2 네트워크 추가 후 100 C2FLR 수령 확인)
- [~] Git 레포 생성 + 두 기기 clone + `.gitignore`/`.env.example` 세팅
      - [x] `.gitignore` 수정 (깨져 있던 PowerShell here-string 텍스트 → 실제 패턴, 8/6)
      - [x] `.env.example` 작성 (KeeperHub/Flare/Supabase 변수 템플릿, 8/6)
      - [x] `.gitattributes` 추가 (두 기기 줄바꿈 churn 방지, 8/6)
      - [x] 기기 세팅 절차를 `/CLAUDE.md` "두 기기 개발"에 정리 (8/6)
      - [x] 두 번째 기기 clone (8/8)
      - [ ] `.env` 값 수동 이전 — 아직 안 함. Phase B에서 실제로 `.env` 읽는 코드 쓸 때 처리 예정
- [x] 두 기기 Node 버전(`.nvmrc`) 통일
      - [x] `.nvmrc` = 24.15.0 + `app/package.json` engines 핀 (8/6)
      - [x] 두 번째 기기: nvm-windows 설치 → `nvm install 24.15.0` → `nvm use 24.15.0` 확인 (8/8)
            (기기2엔 Node/npm/claude CLI 자체가 없어서 처음부터 설치. `npm install --prefix app`도 완료)

## Phase B — 공유 뼈대 (8/7-8/9, 압축) 🟢

- [x] **⛔ 레포 구조 결정 (선행)** (8/8) — `app/` 안에 통합 (Next 스캐폴드와 같은 프로젝트, `@/*` 별칭 사용):
      `app/agent/`(analyzer·prompt·claude·types·prompts/), `app/executors/`(types·keeperhub·flare),
      `app/lib/`(공용, 아직 빈 상태). `contracts/`는 Phase D까지 별개 그대로.
- [x] Next.js 대시보드 골격 (지갑 주소 등록 / 로그 뷰) (8/9) — UI만, 백엔드 미연결.
      `_components/guard-panel.tsx`(방패 아이콘, 감시 상태 표시 + 지갑 입력) + `log-table.tsx`(플레이스홀더 로그).
      색 최소화(무채색 + 심각도는 왼쪽 바 색으로만, 에메랄드 1색 강조), 네온/그라디언트 없음.
      ※ 원래 이름은 `wallet-form.tsx`였는데 이후(Phase C) `guard-panel.tsx`로 리디자인+실제 백엔드 연결됨 — 아래 참조.
- [x] Executor 인터페이스 정의 (`provisionMonitoring`, `execute`) (8/8) — `app/executors/types.ts`.
      `keeperhub.ts`/`flare.ts`는 인터페이스 구현 스켈레톤만(메서드는 throw) — 실제 호출부는 각각 Phase C/D.
- [x] **액션 enum 확정 (8/9)** — 상세는 architecture.md §10. `app/executors/types.ts`의 `ActionType`에 반영.
- [x] Agent 로직 - analyzer (지갑 조회 → 리스크 프로파일) (8/9)
      viem 추가 + `analyzeWallet()` 실구현(네이티브 잔고). 실행 지갑(`0x2b33...BcE3`)으로
      실제 조회해 `0.049 ETH` 확인(첫 tx 후 잔액과 일치) — 동작 검증 완료.
      Aave 포지션 조회는 스코프 밖(아래 후속 항목).
- [x] 프롬프트 템플릿 초안 (8/9) — `prompts/diagnoser.md`(사건→severity/diagnosis),
      `prompts/strategist.md`(진단→액션, enum 표 포함해 이탈 방지)

**로드맵으로 미룬 것 (8/9 스코프 조정):** "판단"의 실체는 Claude가 프롬프트를 읽고 하는 것이지
`.ts` 함수 안의 로직이 아니다(architecture.md "런타임: Claude Desktop/Code + MCP, API+서버는 로드맵").
- [x] **실제 Claude API 호출 (8/12 — 로드맵에서 앞당겨 구현)** — `app/agent/claude.ts`의 `askAgent()`.
      `@anthropic-ai/sdk`, 모델 `claude-opus-5`, 응답을 `output_config.format`(json_schema)으로 강제.
      스키마의 enum은 `ACTION_TYPES`/`SEVERITIES`를 그대로 스프레드해서 만든다 — 목록을 베끼지 않으니
      enum이 바뀌면 스키마도 같이 바뀐다. 검증은 이중이다: 스키마가 형식을 강제하고, 그래도 어긋난 게
      오면 `parseVerdict`가 거부한다.
      서버 액션 `stepDiagnose`(조립→호출→검증)를 콘솔 3막에 배선 — **복사-붙여넣기 없이 버튼 하나로
      돈다.** 수동 경로(`stepBuildPrompt`/`stepParseVerdict`)는 API 키 없는 기기용 폴백으로 `<details>`
      안에 남겼다.
      ⚠️ **라이브 응답은 아직 못 받았다** — 키는 유효하고 요청도 통과했는데(401 아님) 계정 크레딧이
      0이라 400. 즉 남은 건 **콘솔에서 크레딧 충전 하나**이고 코드 문제가 아니다.
      점검용: `node --env-file=app/.env app/node_modules/tsx/dist/cli.mjs app/scripts/check-agent.ts`
      (온체인 조회 없이 가짜 스냅샷으로 조립→호출→검증만 태운다)
- [ ] analyzer의 Aave v3 포지션 조회 — Sepolia Pool 컨트랙트 주소가 architecture.md에 없어서 보류
      (MVP 감시 범위 확정 여부는 "결정 대기" 참조)

## Phase C — KeeperHub 버전 (8/9-8/12) 🔵

> **스코프 밸브** — 밀리면 버리는 순서: ①Marketplace 등록 ②Safe+Zodiac ③대시보드 완성도
> **사수**: 첫 tx / Phase0 자동 생성 데모 / tx 해시 증빙 (이 셋이 우리 주장의 전부)

- [x] KeeperHubExecutor - `provisionMonitoring` (8/9) — `@modelcontextprotocol/sdk`로 MCP HTTP
      헤드리스 연결(`Bearer kh_...`). 워크플로우 node/edge 구조는 실제 "Aave Health Factor Monitor"
      워크플로우를 `list_workflows`로 조회해 그대로 참고(지어내지 않음).
      **실제 검증 완료**: `0x2b33...BcE3`로 호출 → KeeperHub에 워크플로우 `sentinel-0x2b33...BcE3`
      (id `0px5s4xgnxtcispelwgjy`) 실제 생성 확인(Schedule 트리거, aave-v3 헬스팩터 조회,
      network 11155111, enabled:true) — `list_workflows`로 재조회해 확인.
      ⚠️ `.env`는 레포 루트가 아니라 **`app/.env`**에 있어야 Next.js/노드가 읽는다 (기록해둠).
- [~] KeeperHubExecutor - `execute` (8/9) — 코드 완성 + 버그 2개 수정(응답 파싱, referralCode 기본값 —
      architecture.md §3 함정 11·13). `SUPPLY_COLLATERAL`을 Sepolia에서 실제로 시도하다가
      **KeeperHub의 Aave v3는 Sepolia 미지원(Ethereum/Base/Arbitrum/Optimism만)**이라는 걸 발견
      (architecture.md §3 참조) — 근본 원인 확인됨, 우리 코드 문제 아님.
      **라이브 검증은 Base 등 지원 체인에서 소액으로 남은 작업** (결정 대기 참조).
- [x] 대시보드 ↔ 백엔드 연결 (8/9) — `_actions/register-wallet.ts`(Server Action)로
      `analyzeWallet` → `provisionMonitoring` 연결. `guard-panel.tsx` "감시 시작" 버튼이
      이제 실제로 워크플로우를 생성함(로컬 state만 바꾸던 스텁에서 교체). pending/error 상태 추가.
      **브라우저에서 실제 검증 완료** — 한 번도 안 써본 개인 지갑 주소(`0x6Bc68c...809c`)를
      대시보드에 입력→클릭했더니 KeeperHub에 새 워크플로우(`sentinel-0x6Bc68c...809c`)가
      실제로 생성됨(`list_workflows`로 확인). UI→Server Action→analyzer→executor→KeeperHub
      전체 배선 살아있음 확인.
      판단 로그 자동 기록(Supabase)은 아직 — `log-table.tsx`는 계속 목업 데이터.
- [~] Phase 0 데모: 지갑 분석 → 워크플로우 자동 생성 시연 (8/9) — `npm run demo:phase0 -- <주소>`로
      스크립트화, 실행 지갑으로 실제 검증 완료(`analyzeWallet` → `provisionMonitoring` 한 번에).
      `idempotency_key`가 `provision-<주소>`라 같은 지갑 재실행해도 워크플로우 안 쌓임 — 리허설에 안전.
      대시보드 버튼으로도 이제 같은 흐름 가능(위 항목).
      **남은 건 촬영뿐.**
- [~] Phase 2 반자동 데모: 사건 투입 → Claude 진단 → 대응 (8/9) — 마지막 실행 단계용
      `npm run demo:execute -- <ACTION_TYPE> '<params json>'` 스크립트 준비됨. 아직 실전 검증은
      못 함(Aave Sepolia 테스트 포지션 필요, 아래 execute 검증과 동일 선행조건).
      **남은 것**: ①데모 시나리오(사건) 확정 ②Aave 테스트 토큰 확보 후 실제 실행 ③촬영
- [ ] (선택·1순위 폐기 대상) Marketplace 등록으로 "실제 호출 가능" 시연
- [ ] 💰 **바운티 노림수** — 함정 목록 13개를 영문 teardown으로 정리 (§8-2).
      공고의 "Best Onboarding UX Improvement"가 "where you got stuck with proposed fixes"를
      명시적으로 인정한다. $1,000 별도 상금이고 Grand Prize와 중복 수상 가능. 추가 작업이 거의 없다.
- [ ] 데모 사전 준비 (§8-2, 8/10 개정) — **WETH 담보 / USDC 차입, Base 메인넷**
      - [ ] 실행 지갑에 **WETH** 확보 ← 방법 미해결(거래소 WETH 직접 출금? ETH 받아 wrap?)
      - [ ] Pool에 WETH approve → `aave-v3/supply`
      - [ ] `aave-v3/borrow` USDC = 담보가치×0.415 → **HF 2.0 착지**(매 단계 실측)
      - [ ] Pool에 USDC approve (상환용)
      ※ 빌린 USDC가 지갑에 남아 방어 실탄이 된다 — 추가 구매 불필요
      ※ 위 전부 KeeperHub 경유 필수. `aave-v3/borrow`는 enum에 없어 MCP 수동 호출
- [ ] 데모 영상 촬영 + 편집
      ※ ⚠️ 스폰서 tx는 지갑 주소 거래목록에 안 뜬다. "지갑 열어 잔고 확인" 연출 불가.
        **tx 해시 → Internal Transactions 탭** 구성으로 촬영할 것 (architecture.md 3장)
- [ ] README 작성 — **`submission/keeperhub` 브랜치의 루트 README = KeeperHub 전용** (§8-1)
      ※ §0-1 두 축 중심 서술(CLAUDE.md 규칙) / 차별화: Hub 정적템플릿 vs AI 동적생성
      ※ tx 해시(`0x8632b1ae…`)로 검증하라는 안내 문구 필수
- [ ] `submission/keeperhub` 브랜치 동결 + 태그 (심사 8/13-8/20 내내 불변이어야 함)
- [ ] **KeeperHub 제출** — 마감(8/13 19:00) 기다리지 말고 준비되는 대로.
      제출 URL은 브랜치 URL(`/tree/submission/keeperhub`)

## Phase D — Flare 버전 (8/9 예정보다 일찍 병렬 착수 → 8/15 04:59) 🟠

> KeeperHub Base 검증과 독립적인 작업이라 8/11까지 안 기다리고 8/9에 바로 시작함.

- [x] flare-hardhat-starter 기반 세팅 (8/9) — 원본 스타터는 LayerZero/FAssets 등 불필요한 예제가
      많아 의존성 충돌 나서, hardhat/토큘박스만 최소로 새로 구성(Hardhat 3 + `hardhat-toolbox-mocha-ethers`).
      `PriceTriggeredSafe`/`AssetVault`라는 이름의 예제는 지금 스타터에 없음(architecture.md 실물 없는
      레퍼런스였던 것으로 확인) — 대신 실제 있는 `FTSOv2RateProvider.sol`로 FTSO 호출 패턴 검증.
      EVM cancun 확인됨(컴파일 로그: "evm target: cancun").
- [x] SentinelVault.sol MVP 작성 (8/9) — 정책 저장(`setPolicy`) + 퍼미션리스 `checkAndExecute`
      (즉시방어/에스컬레이션 분기) + 화이트리스트 `agentRespond`. ActionType enum을
      `app/executors/types.ts`와 이름·순서 동일하게 맞춤. **컴파일 성공.**
- [x] FtsoV2 피드 조회 통합 (`getFeedById`) (8/9) — `ContractRegistry.getTestFtsoV2()` 실제 컴파일 확인
- [x] 즉시방어 / 에스컬레이션 분기 로직 (최소 성립선) (8/9) — **실동작 검증 완료.**
      `npm run demo:coston2`(contracts/): `setPolicy`가 실제 FTSO FLR/USD 가격을 기록,
      `checkAndExecute`가 그 값으로 실제 판단(정상 상태 → 조용히 통과). architecture.md §0-1
      참조 — Flare 버전도 "실데이터+판단" 두 축 증명됨.
      ⚠️ 함정: `checkAndExecute` 가스 자동견적 불안정(out-of-gas) — 명시적 gasLimit 필수(§3 기록).
- [ ] Volatility Incentive (`offerIncentive`) 통합 ★차별화 — 의도적으로 미룸.
      `IFastUpdateIncentiveManager.offerIncentive()`가 커스텀 fixed-point 타입(Range/SampleSize)을
      요구해서, 지어내지 않고 제대로 조사한 뒤 붙일 것
- [x] **Coston2 배포 완료 (8/9)** — `0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF`
      (agent = `0x6Bc68c3C6d4D9B02E435dF25bBc22E59541C809c`, 개인 지갑 재사용).
      `eth_getCode`로 실제 bytecode 존재 확인. 익스플로러:
      https://coston2-explorer.flare.network/address/0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF
      제출물 "smart contract address"에 이 주소 기입하면 됨 — architecture.md §3에도 기록.
- [ ] **FlareExecutor 어댑터 (`setPolicy`, `agentRespond`) ← 최우선, KeeperHub 제출 전에** (§8-1)
      ※ 지금 `throw` 스텁이고 파일 주석도 낡음("컨트랙트가 아직 없어" — 8/9에 배포됨)
      ※ `contracts/scripts/demo-provision-and-check.ts`가 이미 하는 일을 인터페이스로 감싸는 것
      ※ 명시적 `gasLimit` 필수 (FLR/USD 매 블록 갱신 → 자동 견적 빗나감, 8/9 실증)
      ※ 같이: `register-wallet.ts`의 `new KeeperHubExecutor()` 하드코딩 → executor 선택으로
        (CLAUDE.md "Executor 경계" 위반 상태 해소)
- [ ] 키퍼 스크립트 (퍼미션리스 `checkAndExecute` 주기 호출)
- [ ] (스코프밸브) FDC 유출검증 - 시간 되면 실구현, 안 되면 인터페이스+로드맵
- [ ] Flare 데모 영상
- [ ] Flare 제출 서면 (기존/신규 구분 + 로드맵) — **`submission/flare` 브랜치 루트 README = Flare 전용**
- [ ] `submission/flare` 브랜치 동결 + 태그
- [ ] **Flare 제출** (브랜치 URL + 영상 + 컨트랙트 주소 `0xBf5778…c3EF`)

## Phase E — CTC (8/13 이후) 🟣

- [ ] Attestcoin 문서/SDK 실사
- [ ] 새 레포에서 CTCExecutor 재구축
- [ ] 미니 투자 덱 (CEIP 심사 대비)
- [ ] CTC 제출

---

## 결정 대기 (우리가 정할 것)
- [x] 액션 enum 최종 목록 (8/9, architecture.md §10 / app/executors/types.ts)
- [x] 제출 tx를 메인넷으로 낼지 — architecture.md §3에 결론 있음: 테스트넷 기본(스폰서 대상,
      크레딧 안 먹음) + 제출용 1~2건만 메인넷 권장
- [x] MVP 감시 범위 확정 (8/9) — KH=Aave v3(코드로 확정: `analyzer.getAaveAccountData`,
      액션 enum), Flare=FTSO 가격 기반 담보 정책(`SentinelVault.setPolicy`). 둘 다 이미
      실제 코드/배포로 구현됐으니 더 논의할 필요 없이 확정된 것으로 처리.
- [x] **데모 시나리오 확정 (8/10)** — architecture.md §8-2. Base USDC 담보/부채로 HF를 1.3대로
      만들어 두고 5막 구성(배치→진단→실행→검증→관측). 공고가 실행에 최고 가중치를 두므로 3막이 핵심.
- [ ] **제출 폼이 브랜치 URL을 받는지 확인 (사용자)** — 안 받거나 "대회 전용 레포"를 규정으로
      요구하면 §8-1의 단일 레포 결정을 뒤집고 레포를 쪼개야 한다. 두 대회 병행 제출 허용 여부도 같이 확인.
- [x] 두 마감 타임존 최종 확인 (8/9) — KeeperHub 8/13 19:00 KST 확정. Flare는 기존 8/15 04:59 유지
      (별도 재확인 필요시 진행)
- [ ] ★ Safe + Zodiac Roles 채택 여부 (온체인 액션 화이트리스트 ↔ 가스 스폰서십 배타. 첫 tx는 끝났으니
      지금이 판단 시점)
- [ ] 스폰서십 vs private routing 택일 (동시 사용 불가)
- [ ] `execute()` 라이브 검증을 Base(등 지원 체인)에서 소액 real fund로 할지, 스킵하고
      Phase 0 + 진단 단계까지만 데모할지 (architecture.md §3, Aave v3 Sepolia 미지원 발견 참조)

---

## 최근 작업 로그
> 각자 세션 끝날 때 한 줄씩. 무엇을 했고 다음이 뭔지.

- 8/6: 기초 정비. `.gitignore` 복구(시크릿 보호가 안 되던 상태였음), `.gitattributes`/`.nvmrc`(24.15.0)/`.env.example`/`contracts/.gitkeep` 추가. Next 스캐폴드 빌드 통과 확인(16.3.0).
  다음 = ①두 번째 기기 clone·환경 맞추기 ②레포 구조 결정(에이전트/executor 코드가 들어갈 자리) ③Phase A KeeperHub MCP 연결(기기별로 각각 `claude mcp add` 필요).
- 8/6: KeeperHub 계정 생성 + MCP 연결·OAuth 완료(`Connected to keeperhub`). 등록은 `--scope user`(`~/.claude.json`).
  다음 = ①`get_wallet_integration`로 Turnkey 지갑 주소 확보 ②`tools_documentation`로 툴 목록 실사 ③Sepolia 파우셋 → 첫 tx(★분수령).
- 8/6: 지갑·툴 실사 완료. 실행 지갑 1개 확인(`0x2b33...BcE3`). 툴 이름은 문서와 대체로 일치, 함정 3개 추가 발견(simulate=불리언 / idempotency_key / 시뮬은 EVM 전용) → architecture.md 반영.
  ⚠️ 리스크: 지갑이 `isManaged:false`라 Turnkey 자동 서명 전제가 불확실. 이게 안 되면 KeeperHub 버전 핵심(무인 대응)이 흔들리므로 최우선 규명.
  다음 = ①Sepolia 파우셋 수령 ②`execute_transfer` simulate로 서명 주체 검증 ③통과 시 실제 실행 → transactionLink 확보(★분수령).
- 8/6: KeeperHub Wallet Management 문서 실사. `isManaged` 오탐 해소(Turnkey 자동 프로비저닝 확인) → 블로커 없음.
  큰 수확 3개: ①가스 스폰서십 조건(테스트넷 무료, private routing과 배타) ②스폰서 tx는 지갑 주소 tx 목록에 안 뜸 → 증빙은 tx 해시로
  ③Safe+Zodiac Roles = 우리 "액션 enum 제한"을 온체인에서 강제하는 수단(채택 여부 결정 대기).
  다음 = Sepolia 파우셋 → `execute_transfer` simulate → 실제 실행(★분수령).
- 8/8 기기2: 기기2에 Node/npm/claude CLI 자체가 없어서 nvm-windows부터 설치 → Node 24.15.0 → `npm install --prefix app` →
  `claude mcp add`+`/mcp` OAuth 순서로 처음부터 세팅. 이어서 워크플로우 수동 생성(`sentinel-test-manual`) 검증,
  Sepolia 파우셋(개인 계정 경유) + Coston2 파우셋(100 C2FLR) 확보, **★첫 tx 성공**까지 한 세션에 완료.
  Phase A 사실상 종료 — 남은 건 `.env` 값 이전(Phase B 코드 작성 시점에) 뿐.
  다음 = Phase B 진입 전 **레포 구조 결정**(architecture.md 6장 표 기준으로 `app/` 안에 agent·executors 자리 정하기) → Executor 인터페이스.
- 8/9 기기2: Phase B 완주 — 레포 구조(`app/agent`, `app/executors`) → Executor 인터페이스 →
  대시보드 골격(무채색, 백엔드 미연결) → 액션 enum(`search_protocol_actions` 실사 기반 7종) →
  analyzer 실구현(viem, 실제 잔고 조회 검증) → diagnoser/strategist 프롬프트 초안.
  diagnoser/strategist 함수 바디는 의도적으로 로드맵行(실제 판단은 Claude API 붙는 단계에서).
  문서 정리: todo.md의 층층이 쌓인 날짜별 메모 통합, 지난 날짜라 더 이상 실행 불가능한 항목(8/6
  오피스아워) 삭제, "결정 대기"와 Phase B 후속 메모 중복 제거, architecture.md §8 완료 표시.
  다음 = Phase C: KeeperHubExecutor 실구현.
- 8/9 기기2 (긴 세션, 이어서): 아주 많이 진행됨 — 순서대로:
  ①`KeeperHubExecutor` 실구현(MCP HTTP, `provisionMonitoring`/`execute`) + 버그 2개 수정
  (응답 파싱이 KeeperHub의 중첩 success/error를 못 보던 것, `aave-v3/supply`의 `referralCode`
  누락 함정) ②대시보드를 실제 백엔드에 연결(`_actions/register-wallet.ts` Server Action,
  `guard-panel.tsx`로 UI 리디자인) — 브라우저에서 실제 워크플로우 생성까지 검증됨
  ③`npm run demo:phase0`/`demo:execute` 스크립트 ④**architecture.md §0-1 "핵심 판단 기준"
  신설** — "①실데이터 조회 ②agent가 그걸로 실제 진단" 두 가지만이 완성/미완성을 가르는
  기준이라고 확정, README 등 앞으로 모든 문서가 이 기준으로 서술되도록 CLAUDE.md에도 반영
  ⑤`SUPPLY_COLLATERAL`을 Sepolia에서 실행하려다 몇 시간 삽질 끝에 **KeeperHub의 Aave v3
  연동이 Sepolia를 아예 지원 안 한다**(Ethereum/Base/Arbitrum/Optimism 메인넷만)는 걸 확인 —
  Base에서 소액 real fund로 검증하기로 함(사용자가 업비트에서 준비 중, **아직 완료 안 됨**)
  ⑥`analyzer.ts`에 `getAaveAccountData()` 추가(Base 실제 헬스팩터/담보/부채 조회, view라
  자금 없이도 됨) — 실행 지갑으로 실증(담보/부채 0, 헬스팩터 무한대) ⑦그 실데이터를
  `prompts/diagnoser.md`→`prompts/strategist.md`에 처음으로 실제 태워봄 → `NO_ACTION` 산출
  — **프로젝트 최초로 §0-1 두 축이 KeeperHub 쪽에서 끝까지 돈 사례** ⑧Flare로 넘어가서
  `flare-hardhat-starter` 세팅(원본은 의존성 충돌 나서 최소 구성으로 재구성, Hardhat 3) →
  `SentinelVault.sol` MVP 작성(정책저장+`checkAndExecute`+`agentRespond`) → **Coston2 실배포**
  (`0xBf5778109e894b7C093D91B8a7518c95Fe74c3EF`) → `setPolicy`/`checkAndExecute` 실행해서
  **Flare 쪽도 §0-1 두 축 실증** (진짜 FTSO 가격 읽고 컨트랙트가 직접 판단). 가는 길에 가스
  자동견적 out-of-gas 버그도 잡음(명시적 gasLimit 필요) ⑨architecture.md의 잘못된 레퍼런스
  (`PriceTriggeredSafe`/`AssetVault` — 실제로 없는 예제였음) 발견해서 정정.

  **다음 세션(다른 기기)이 알아야 할 것:**
  - `contracts/.env`는 새로 생긴 파일이라 **이 기기에서도 새로 채워야 함** — `DEPLOYER_PRIVATE_KEY`
    (개인 지갑 `0x6Bc68c...809c` 재사용 중, Coston2 배포+agentRespond 서명용) + `COSTON2_RPC_URL`.
    루트 `.env`/`app/.env`와 별개 파일이다 (`contracts/.env.example` 참조)
  - `contracts/`도 `npm install` 새로 필요 (`app/`과 별개 node_modules)
  - **막혀있는 지점**: KeeperHub `execute()` 라이브 검증이 Base 자금(업비트에서 사서 개인
    지갑 경유 → 실행 지갑 `0x2b33...BcE3`로) 준비를 기다리는 중. 자금 준비되면
    `npm run demo:execute -- SUPPLY_COLLATERAL '{...}'` (network를 Base로, architecture.md
    §3 참조)로 이어가면 됨
  - Flare는 `FlareExecutor.ts`가 아직 `throw` 스텁 — `contracts/scripts/demo-provision-and-check.ts`
    처럼 Hardhat 스크립트로 직접 호출한 거지, 우리 Executor 인터페이스를 아직 안 거침. 다음 단계로
    `setPolicy`/`agentRespond`를 `ethers`로 감싸면 됨
  - 데모 영상·README는 두 트랙 다 0% — architecture.md §0-1을 중심으로 써야 함(CLAUDE.md 규칙)
  - 남은 "결정 대기": Safe+Zodiac(스킵 추천), 스폰서십 vs private routing(스폰서십 추천),
    데모 시나리오 자산·급락 연출

- 8/10 기기1: 진행현황 대조만 함(코드 변경 없음). 이 기기가 8/6 이후 pull을 안 해서 나흘치(커밋 30개)를
  모르고 있었음 — pull로 동기화 완료. KeeperHub 서버 실물도 `list_workflows`/`list_integrations`로 직접 대조:
  워크플로우 7개(샘플 3 + `sentinel-test-manual`/`sentinel-0x2b33…`/`sentinel-approve-usdc-pool`/`sentinel-0x6Bc68c…`),
  통합 지갑 1개 — 전부 todo.md 기록과 일치. 문서가 실제 상태를 정확히 반영하고 있음을 확인.
  ⚠️ 문서 정합성 하나: §3의 "Sepolia 권장"(8/6, 스폰서십+Safe 기준)과 "Aave v3는 Sepolia 미지원"(8/9)이
  나란히 있어 오해 소지 — 전자는 전송/스폰서십 한정, Aave는 Base라는 단서를 붙이면 깔끔.
  다음 = ①README·데모영상 착수(최우선, 둘 다 0%) ②`FlareExecutor` 스텁 해소(현재 Hardhat 스크립트로
  직접 호출 중이라 Executor 인터페이스를 안 거침 — CLAUDE.md "Executor 경계" 규칙과 어긋남)
  ③Base 자금 도착 시 `execute()` 라이브 검증(§0-1 기준으론 이미 통과라 스코프밸브 대상)
- 8/10 기기1: 제출물 구성 결정(architecture.md §8-1 신설). 핵심은 **KeeperHub 심사창(8/13-8/20) 안에
  Flare 마감(8/15)이 통째로 들어간다**는 것 — 같은 브랜치면 심사 중에 무관한 커밋이 계속 쌓인다.
  결론: 레포는 하나로 두되 제출은 `submission/keeperhub` / `submission/flare` 브랜치로 동결.
  브랜치마다 루트 README가 달라져 두 심사위원이 각자 트랙 문서만 본다(앵커 분리안은 폐기).
  덤으로 순서도 바뀜 — `FlareExecutor`를 KeeperHub 제출 *전에* 뚫는다(동결되면 스텁이 8/20까지 박제됨).
  다음 = `FlareExecutor` + executor 선택 배선 → README → 영상 → 동결·제출.
- 8/10 기기1 (긴 세션): 코드 변경 2건 + 문서 대폭 정리. **다른 기기로 넘기기 전 상태.**
  ①`.env`/코드의 `KEEPERHUB_DEV_CHAIN_ID`를 8453(Base)로 — 안 바꿨으면 Aave 미지원 Sepolia로 조용히 나갔다
  ②`keeperhub.ts`에 Aave 필수 파라미터 기본값 배선(`onBehalfOf`/`to`=실행지갑, repay `interestRateMode:"2"`)
    + 응답 파싱 실패를 성공으로 보던 것 수정. **`KEEPERHUB_EXECUTOR_ADDRESS`를 `app/.env`에 넣어야 동작**
  ③UI·워크플로우 설명·데모 콘솔 출력 전부 영어화(노출되는 것만. 주석·docs는 한국어 유지 — CLAUDE.md 규칙)
  ④데모 시나리오를 공고 기준으로 재설계 → **USDC/USDC 폐기, WETH담보/USDC차입 + Base 확정**(§8-2)
  ⑤Base 리저브 파라미터를 **온체인 직접 조회로 확정**(WETH 청산임계값 83%, USDC 78%, 주소·자릿수,
    둘 다 isolation/siloed 아님) — `app/scripts/check-base-reserve.ts` 남겨둠
  ⑥차별화 대사 수정 — `search_templates` 실사 결과 `Aave V3 Auto-Repay on Low Health` 등이 **이미 공개 템플릿**.
    "자동 방어"는 차별점이 아니다. 감시망 동적 설계 + enum 제한 LLM 판단으로 서술할 것
  ⑦`execute_protocol_action`에 `simulate`/`idempotency_key`가 **없다**는 것 발견 → 3막 대본 수정, §3 정정
  ⑧미검증 목록을 데이터뿐 아니라 **코드가 추측에 기댄 부분까지** 확장(§8-2 B~I)

  **다음 기기가 이어서 할 것 (우선순위):**
  - 자금(WETH) 경로 해결 ← 임계경로. Sepolia 폴백을 폐기했으므로 대안이 없다
  - `FlareExecutor` 배선 (제출 브랜치 동결 전 필수)
  - README·영상 (두 트랙 다 0%, 마감까지 3일)
  - 사용자 확인 대기: 제출 폼의 브랜치 URL 허용 여부 / 가스 크레딧 잔여 / 업비트 Base 출금 지원
- 8/11 기기1: 자금 없이 가능한 검증을 전부 소진 + 대시보드를 발표용으로 재작성. **다른 기기로 넘기는 시점.**

  **① Base 메인넷 첫 tx 성공 (자금 0원).** `web3/approve-token`(USDC → Aave Pool)을 워크플로우로 실행 →
  `0x3e6718070bf85cc386e311d04c530ecccc21efe8695f454fc2bcc4206864e5c6`. 이걸로 §8-2 미검증 C가 통째로 해소:
  tx 링크 위치 / audit trail 형태(`get_execution`이 `verified:true`+`receiptStatus` 포함) /
  스폰서 tx 형태(top-level to = 릴레이어) / **실측 가스 $0.003** 확인.
  **이 approve는 프로브가 아니라 실제 셋업 1단계이기도 하다** — USDC 담보 공급의 선행 조건.

  **② 새 함정 4개** (전부 architecture.md §3 함정 11~15에 기록):
  `web3/*`는 직접 실행 불가(501, 워크플로우 필수) / `execute_workflow`는 결과가 아니라 running만 반환 /
  **금액 단위가 계열마다 반대**(`web3/*`=사람이 읽는 값, `aave-v3/*`=uint256 base unit) /
  **스폰서십이 액션 종류로 갈린다**(`web3/*` 대납, `aave-v3/*` 미대납 → 먼지 ETH 필요) /
  `create_workflow`는 설정을 검증해주지만 직접 실행은 안 해준다(불확실하면 워크플로우로 먼저 검증)

  **③ 코드 수정**: `toTxResult`가 `result` 중첩까지 보도록(응답 봉투 `{success, result:{...}}` 확인 결과) /
  `provisionMonitoring` 반환을 `void` → `ProvisionResult`(참조·라벨·링크·원본)로 확장 /
  `check-base-reserve.ts`의 BigInt 리터럴이 `tsc`·`next build`를 깨뜨리던 것 수정(내가 낸 버그였음)

  **④ 대시보드를 5막 실행 콘솔로 재작성** (`_components/run-console.tsx`, `_actions/run-steps.ts`).
  단계마다 상태·소요시간·값+한 줄 설명·원본 JSON·익스플로러 링크 노출. 실제 순차 호출이라 화면 순서=실행 순서.
  **목업 로그 테이블은 번역 대신 삭제** — 지어낸 로그가 진짜 tx 옆에 있는 게 §8-1 정직성 위험이었다.
  `guard-panel.tsx`/`register-wallet.ts`는 콘솔에 흡수돼 제거.

  **시나리오 대비 현황 (§8-2 기준):**
  - 1막 배치 — ✅ 코드 완성. ⚠️ **체인 ID를 8453으로 바꾼 뒤 `provisionMonitoring`을 안 돌려봤다.**
    8/9에 만든 워크플로우들은 `network: 11155111`(Sepolia)로 박혀 있다. 다음 기기에서 한 번 돌려 확인할 것
  - 2막 진단 — ⚠️ 파이프라인은 돌지만 **위험한 포지션에서 한 번도 안 돌려봤다**(§8-2 F)
  - 3막 실행 — ❌ **Aave 쓰기가 한 번도 성공한 적 없다.** 자금이 오면 풀린다. 심사 최고 가중치 항목
  - 4막 검증 — ✅ 스폰서 tx 형태 실증 완료
  - 5막 관측 — ✅ `get_execution` 화면 확보. **단 콘솔이 아니라 KeeperHub 대시보드에서 찍어야 한다**

  **다음 기기가 할 일 (순서대로):**
  - `app/.env`에 `KEEPERHUB_EXECUTOR_ADDRESS=0x2b33afb068a77b103fFAF0b7d9F128209076BcE3` 추가
    (없으면 `execute()`가 즉시 실패한다) + `KEEPERHUB_DEV_CHAIN_ID=8453`
  - Base 자금(USDC + 먼지 ETH) 경로 해결 ← 임계경로
  - `FlareExecutor` 배선 (제출 브랜치 동결 전 필수)
  - README·영상
- 8/11 기기2 (세션 이어받음): 콘솔 UI를 발표 방식으로 재구성 + "이게 진짜 agent냐" 질문에서
  나온 실제 구멍 두 개를 메움.
  ①`run-console.tsx`를 1막→2막 자동 연쇄에서 **막마다 버튼으로 진행**하는 구조로 변경 —
  다음 막은 이전 막이 성공해야 화면에 나타남(`step-enter` 슬라이드 애니메이션). 원본 JSON은
  기본 접힘, 토글로 펼침(`collapsible-grid`).
  ②"프롬프트 없이 데이터만 주면 agent라 부를 수 있나?" 논의 끝에 `app/agent/prompt.ts` 신설 —
  `diagnoser.md`+`strategist.md`를 코드로 읽어 실데이터와 합친 **완성된 프롬프트 문자열**을
  조립하고(콘솔에 그대로 노출, 복사 버튼 포함), Claude가 낸 응답을 `parseVerdict()`가
  `action`을 `isActionType()`으로 검증해서 enum 밖이면 거부. **이전엔 이 검증이 콘솔에
  아예 없었다** — `demo-execute.ts`엔 있었는데 콘솔의 수동 입력 경로엔 빠져있던 걸 발견해서
  통일(`isActionType`을 `executors/types.ts`에 단일 소스로 옮김).
  ③`diagnoser.md`/`strategist.md`를 영어로 번역 — 이제 콘솔에 그대로 노출되니 CLAUDE.md
  "노출되는 건 전부 영어" 규칙 적용 대상이 됨.
  ④"API 키만 연결하면 동일하게 동작한다"를 UI 문구로 명시(3막 서브타이틀 + 본문) — 조립·검증은
  코드, 사람이 하는 유일한 일은 "이 문자열을 Claude에 보내고 답을 붙여넣는 것"뿐이라고 못박음.
  ⑤부수적으로 Turbopack 워크스페이스 루트 오판 버그 발견·수정(`next.config.ts`에 `turbopack.root`
  명시) — 루트에 있던 빈 `package-lock.json`을 정리하다 드러남.
  다음 = Base 자금 경로(임계경로) / `FlareExecutor` 배선 / README·영상 — 전부 미해결로 남음.
- 8/12 기기2: 코드 변경 없음. **Base 자금 경로(임계경로) 실행 계획을 확정** — 다음 기기가
  자금 확보를 이어받을 수 있도록 여기 기록.

  **확정된 경로:** 바이낸스에서 현금충전 USDT 보유 중 → (Funding→Spot 이체 필요할 수 있음) →
  **ETH만 매수**(USDC는 별도 구매 불필요 — Aave에서 `borrow`로 나온 USDC를 그대로 씀,
  §8-2 "빌린 USDC가 그대로 지갑에 남으므로 방어용 실탄을 따로 살 필요 없다"와 동일 논리) →
  **Base 네트워크로 직접 출금**(이더리움 메인넷으로 받으면 공식 브릿지 단계가 추가로 필요해지고
  L1 가스까지 붙어서 비효율 — 처음부터 Base 네트워크 선택) → 개인 지갑 → **WETH로 wrap**
  (Base WETH 컨트랙트 `0x4200000000000000000000000000000000000006`의 `deposit()`을 Basescan
  "Write Contract"나 Uniswap 스왑으로 직접 호출 — Aave가 wrap을 대신해주지 않음, §8-2
  미검증목록 항목 그대로 유효) → 실행 지갑(`0x2b33…BcE3`)으로 WETH 전송 → 이후 전부
  KeeperHub 경유(approve→supply→borrow→repay).

  **금액**: 담보 0.01~0.015 ETH + 가스/출금수수료 버퍼 목표로 50~100 USDT 선에서 준비 중
  (정확한 액수는 사용자가 매수 시점 시세 보고 결정 — 하드코딩 안 함).

  **아직 미확정**: 바이낸스가 ETH 출금 네트워크 목록에 "Base"를 직접 지원하는지(대부분 주요
  거래소가 지원하지만 확인 안 됨), wrap을 KeeperHub 워크플로우로 태울지 개인 지갑에서 수동으로
  한 번 할지 — 여전히 §8-2 미검증 목록 그대로.
  다음 = 위 경로대로 실제 자금 확보 실행 → 확보되면 `execute()` 라이브 검증(3막) 재개.

- 8/12 기기1: **에이전트가 코드에서 직접 Claude를 호출하게 만들었다** — 루프에서 사람이 끼는
  마지막 한 칸(프롬프트를 복사해 붙여넣고 답을 다시 붙여넣기)이 사라졌다.
  ①`app/agent/claude.ts` 신설(`askAgent`) — SDK, `claude-opus-5`, `output_config.format` json_schema.
  ②스키마 enum을 손으로 안 적으려고 `ACTION_TYPES`(executors/types.ts)와 `SEVERITIES`(agent/types.ts)를
  `export`로 바꿔 스프레드 — 목록이 두 벌 생기면 하나 바뀔 때 나머지가 안 바뀌는 사고가 난다
  (`isActionType` 주석에 이미 같은 사고가 기록돼 있다).
  ③서버 액션 `stepDiagnose` + 콘솔 3막 배선. 모델 원문(`raw`)과 소요시간을 화면에 그대로 띄운다 —
  판정이 우리가 지어낸 게 아니라는 증거. 수동 경로는 `<details>` 폴백으로 남김.
  ④**버그 하나 잡음**: `prompt.ts`가 프롬프트 .md를 `process.cwd()` 하나로만 찾고 있었다. 레포
  루트에서 스크립트를 돌리면 ENOENT. 후보 경로 3개(cwd, cwd/app, `__dirname`)를 순서대로 훑도록 수정.
  ⑤SDK 에러를 사람이 읽는 한 줄로 변환(401 / 크레딧 부족) — 데모 중 화면에 JSON 덩어리가 뜨는 걸 막는다.

  **막힌 지점**: 라이브 응답 미확인. 키는 유효(401 아님), 요청 형식도 통과, **계정 크레딧 0으로 400**.
  → 사용자가 console.anthropic.com에서 크레딧 충전하면 그대로 돈다. 코드 수정 필요 없음.

  ⚠️ **보안 미해결**: 이전 세션에서 채팅에 붙여넣은 Anthropic 키는 노출된 것으로 간주해야 한다.
  console.anthropic.com에서 **폐기 후 재발급**하고 새 키를 `app/.env`에만 넣을 것. (코드는 전부
  `process.env.ANTHROPIC_API_KEY`만 읽는다 — 키가 파일·커밋에 들어간 곳은 없다.)

  다음 = 크레딧 충전 후 3막 라이브 확인 / Base 자금 경로(임계경로) / `FlareExecutor` 배선 /
  `docs/keeperhub-teardown.md`(README가 이미 링크 중) / 영상·제출.

- 8/12 기기1(이어서): **주석 최소화 + 죽은 스텁 삭제.** 주석이 변경이력처럼 쌓여 있어서
  (날짜·페이즈번호·문서 섹션 포인터·아랫줄 재서술) 핵심 로직이 오히려 안 보이던 걸 정리.
  19개 파일에서 주석 213줄 → 82줄. **남긴 기준 = 코드만 봐서 복원 불가능한 것**(KeeperHub가
  실패를 성공 봉투 안에 담아 준다 / 스키마상 optional인데 빠지면 거부되는 필드 / cancun 필수 /
  빠른 피드라 gas 자동견적이 빗나간다 / 파싱 실패를 성공으로 보고하지 않는 이유 / Solidity enum과
  TS ActionType 순서 일치) + 모듈당 "이게 무엇인가" 한 줄.
  `app/agent/diagnoser.ts`·`strategist.ts` **삭제** — 어디서도 import 안 되는 죽은 스텁인데
  `claude.ts`가 생기면서 주석 내용까지 거짓이 됐고, 심사위원이 소스를 열었을 때 에이전트 핵심
  함수가 `not implemented`로 보이는 게 손해라 판단. 둘만 쓰던 `Diagnosis`/`Strategy` 타입도 같이 제거.
  (프롬프트 `.md` 두 개는 `prompt.ts`가 계속 읽으므로 유지)
  README의 "diagnosis is relayed by hand" 단락을 실제 동작(API 호출 + enum 이중 강제)에 맞게
  다시 씀 — 제출 서면이라 거짓 진술이 남으면 안 됨. `ANTHROPIC_API_KEY`도 env 목록에 추가.
  검증: `next build` 통과, 컨트랙트 `solc 0.8.25 (evm target: cancun)` 컴파일 통과
  (이 기기에 `contracts/node_modules`가 없어서 설치부터 함 — 두 기기 세팅 항목 그거).
