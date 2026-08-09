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

**⏰ 8/10 08:50 현재 — KeeperHub 마감까지 약 3일 10시간, Flare까지 약 5일.**
기술 코어는 두 트랙 다 §0-1 두 축을 이미 실증했다. **남은 최대 리스크는 기능이 아니라 제출물이다**
— 영상·README가 두 트랙 다 0%. 지금부터는 신규 기능보다 제출물을 먼저 끝내는 편이 안전하다.

**다음 세션 시작점 (8/9 세션 종료 시점 기준) — 아래 "최근 작업 로그" 맨 마지막 항목 필독:**
Base(KeeperHub 쪽)에 자금 준비하고 `execute()` 라이브 검증 → Flare `FlareExecutor` 연결 →
두 트랙 다 데모 영상·README. 상세는 로그 참조.

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
      `app/agent/`(analyzer·diagnoser·strategist·types·prompts/), `app/executors/`(types·keeperhub·flare),
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
- [ ] diagnoser/strategist 함수 바디의 실제 Claude API 호출 — API+서버 붙일 때. 지금은 `throw` 스텁
      유지, 반자동 데모(Phase C)는 사람이 Claude Code 세션에 프롬프트를 직접 넣는 방식으로 진행.
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
- [ ] 데모 영상 촬영 + 편집
      ※ ⚠️ 스폰서 tx는 지갑 주소 거래목록에 안 뜬다. "지갑 열어 잔고 확인" 연출 불가.
        **tx 해시 → Internal Transactions 탭** 구성으로 촬영할 것 (architecture.md 3장)
- [ ] README 작성 (차별화 섹션: Hub 정적템플릿 vs AI 동적생성)
      ※ tx 해시로 검증하라는 안내 문구 필수
- [ ] **KeeperHub 제출 (8/13 19:00)** (레포 + 영상 + **tx 해시** 링크)

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
- [ ] FlareExecutor 어댑터 (`setPolicy`, `agentRespond`)
- [ ] 키퍼 스크립트 (퍼미션리스 `checkAndExecute` 주기 호출)
- [ ] (스코프밸브) FDC 유출검증 - 시간 되면 실구현, 안 되면 인터페이스+로드맵
- [ ] Flare 데모 영상
- [ ] Flare 제출 서면 (기존/신규 구분 + 로드맵)
- [ ] **Flare 제출** (레포 + 영상 + 컨트랙트 주소)

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
- [ ] 데모 시나리오 자산·급락 연출 방법
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
