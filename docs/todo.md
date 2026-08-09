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

- 🔵 KeeperHub: **8/13 19:00** (제출 페이지 로컬 타임존 재확인 필요)
- 🟠 Flare: **8/15 04:59** (간극 약 34h)
- 🟣 CTC: 9/6 (8/13 이후 착수)

**8/9 기준: Phase A·B 완료, Phase C 진입.** 원안 대비 있었던 3~4일 지연(8/6 시점)은 Phase B를
8/7-8/9로 압축해 흡수했다 — 개정 일정은 architecture.md 8장 참조. 다음 = KeeperHubExecutor 실구현.

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
      `_components/wallet-form.tsx`(지갑 입력, 로컬 state만) + `log-table.tsx`(플레이스홀더 로그).
      색 최소화(무채색 + 심각도 라벨만 절제된 색), 네온/그라디언트 없음.
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
- [~] KeeperHubExecutor - `execute` (8/9) — 코드는 구현됨(`execute_protocol_action`, 액션 enum →
      `aave-v3/*` 매핑, architecture.md §10). **아직 실제 실행은 안 해봄** — 진짜 supply/withdraw
      tx라 자금이 움직여서, 실제 검증은 데모 때 진행.
- [ ] Phase 0 데모: 지갑 분석 → 워크플로우 자동 생성 시연
- [ ] Phase 2 반자동 데모: 사건 투입 → Claude 진단 → 대응
- [ ] (선택·1순위 폐기 대상) Marketplace 등록으로 "실제 호출 가능" 시연
- [ ] 데모 영상 촬영 + 편집
      ※ ⚠️ 스폰서 tx는 지갑 주소 거래목록에 안 뜬다. "지갑 열어 잔고 확인" 연출 불가.
        **tx 해시 → Internal Transactions 탭** 구성으로 촬영할 것 (architecture.md 3장)
- [ ] README 작성 (차별화 섹션: Hub 정적템플릿 vs AI 동적생성)
      ※ tx 해시로 검증하라는 안내 문구 필수
- [ ] **KeeperHub 제출 (8/13 19:00)** (레포 + 영상 + **tx 해시** 링크)

## Phase D — Flare 버전 (8/11 병렬 착수 → 8/15 04:59) 🟠

- [ ] flare-foundry-starter 또는 flare-hardhat-starter clone (EVM cancun 설정)
- [ ] SentinelVault.sol 뼈대 (PriceTriggeredSafe + AssetVault 예제 기반)
- [ ] FtsoV2 피드 조회 통합 (`getFeedById`)
- [ ] 즉시방어 / 에스컬레이션 분기 로직 (최소 성립선)
- [ ] Volatility Incentive (`offerIncentive`) 통합 ★차별화
- [ ] Coston2 배포 + 컨트랙트 주소 확보
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
- [ ] MVP 감시 범위 확정 (KH=Aave v3 / Flare=담보볼트) — 액션 enum이 이미 aave-v3 기준이라
      사실상 기정사실에 가깝지만, 공식적으로 체크는 안 된 상태
- [ ] 데모 시나리오 자산·급락 연출 방법
- [ ] 두 마감 타임존 최종 확인
- [ ] ★ Safe + Zodiac Roles 채택 여부 (온체인 액션 화이트리스트 ↔ 가스 스폰서십 배타. 첫 tx는 끝났으니
      지금이 판단 시점)
- [ ] 스폰서십 vs private routing 택일 (동시 사용 불가)

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
