# todo.md — Sentinel 진행 상황

> "지금 어디까지 됐는지"를 추적한다. 두 기기(집 랩탑 / 회사 데스크탑)가 이 파일로 동기화한다.
> 작업을 끝내면 해당 항목을 체크하고 커밋하라. 세션 시작 시 이 파일을 먼저 읽어라.
>
> 상태 표기: `[ ]` 미착수 / `[~]` 진행중 / `[x]` 완료
> 각 항목에 담당 기기와 날짜를 남기면 좋다. 예: `[x] ... (데스크탑, 8/6)`
>
> **새 기기에서 시작한다면 `docs/setup.md` 를 먼저 따라 할 것.** (clone·Node·MCP 연결·`.env` 절차)

---

## 마감
- 🔵 KeeperHub: **8/13 19:00** (제출 페이지 로컬 타임존 재확인 필요)
- 🟠 Flare: **8/15 04:59** (간극 약 34h)
- 🟣 CTC: 9/6 (8/13 이후 착수)

---

## Phase A — 셋업 & 검증 (D1-2)

- [~] KeeperHub 계정 생성 + Turnkey 지갑 확인
      - [x] 계정 생성 + 온보딩 (8/6, 기기1)
      - [x] 실행 지갑 주소 확보 `0x2b33...BcE3` (8/6) — 주소·integrationId는 architecture.md
      - [x] ✅ `isManaged:false` 규명 완료 (8/6) — 오탐. Turnkey EOA 자동 프로비저닝 지갑이 맞고
            자동 서명 유효. `isManaged`는 Safe 미부착 상태를 뜻함. 상세는 architecture.md
- [x] `claude mcp add` 로 MCP 연결 + `/mcp` OAuth 완료 (8/6, 기기1 — `Connected to keeperhub` 확인)
      ※ `--scope user`라 두 번째 기기에서 등록+OAuth 재실행 필요
- [x] MCP 툴 목록 실사 (`tools_documentation` — 함정 3개 추가 발견, architecture.md 반영, 8/6)
- [ ] MCP 툴로 워크플로우 1개 수동 생성 (`create_workflow`)
- [ ] **Sepolia** 파우셋으로 테스트 자산 확보 (수령 주소 = 위 실행 지갑) ← 다음 작업
      ※ Base Sepolia 아닌 Sepolia 권장 — 스폰서십+Safe 둘 다 지원되는 유일한 테스트넷
      ※ 스폰서십이 붙어도 가스용 ETH는 EOA에 조금 넣어두는 게 안전
- [ ] **첫 트랜잭션 성공** (`execute_transfer` simulate→실행→transactionLink 확보) ★분수령
- [ ] Coston2 파우셋(C2FLR) 확보 + RPC 연결 확인
- [~] Git 레포 생성 + 두 기기 clone + `.gitignore`/`.env.example` 세팅
      - [x] `.gitignore` 수정 (깨져 있던 PowerShell here-string 텍스트 → 실제 패턴, 8/6)
      - [x] `.env.example` 작성 (KeeperHub/Flare/Supabase 변수 템플릿, 8/6)
      - [x] `.gitattributes` 추가 (두 기기 줄바꿈 churn 방지, 8/6)
      - [x] `docs/setup.md` 작성 — 기기 세팅 절차 문서화 (8/6)
      - [ ] 두 번째 기기 clone + `.env` 값 수동 이전 (`docs/setup.md` 따라 진행)
- [~] 두 기기 Node 버전(`.nvmrc`) 통일
      - [x] `.nvmrc` = 24.15.0 + `app/package.json` engines 핀 (8/6)
      - [ ] 두 번째 기기에서 `nvm use` 적용 확인

## Phase B — 공유 뼈대 (D3-5) 🟢

- [ ] Next.js 대시보드 골격 (지갑 주소 등록 / 로그 뷰)
- [ ] Executor 인터페이스 정의 (`provisionMonitoring`, `execute`)
- [ ] Agent 로직 - analyzer (지갑 조회 → 리스크 프로파일)
- [ ] Agent 로직 - diagnoser (사건 → 진단)
- [ ] Agent 로직 - strategist (진단 → 액션 enum 선택)
- [ ] 프롬프트 템플릿 초안
- [ ] 액션 enum 확정 (`search_protocol_actions` 결과 + AssetVault 패턴 참고)

## Phase C — KeeperHub 버전 (D6-9) 🔵

- [ ] KeeperHubExecutor - `provisionMonitoring` (`create_workflow`로 감시망 생성)
- [ ] KeeperHubExecutor - `execute` (`execute_check_and_execute` / `execute_protocol_action`)
- [ ] Phase 0 데모: 지갑 분석 → 워크플로우 자동 생성 시연
- [ ] Phase 2 반자동 데모: 사건 투입 → Claude 진단 → 대응
- [ ] (선택) Marketplace 등록으로 "실제 호출 가능" 시연
- [ ] 8/4 or 8/6 오피스아워에서 컨셉·구현 검증
- [ ] 데모 영상 촬영 + 편집
- [ ] README 작성 (차별화 섹션: Hub 정적템플릿 vs AI 동적생성)
- [ ] **KeeperHub 제출** (레포 + 영상 + 트랜잭션 링크)

## Phase D — Flare 버전 (D8-14, 병렬 착수) 🟠

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
- [ ] 액션 enum 최종 목록
- [ ] MVP 감시 범위 (KH=Aave v3 유력 / Flare=담보볼트)
- [ ] 데모 시나리오 자산·급락 연출 방법
- [ ] 두 마감 타임존 최종 확인
- [ ] ★ Safe + Zodiac Roles 채택 여부 (온체인 액션 화이트리스트 ↔ 가스 스폰서십 배타. 첫 tx 이후 판단)
- [ ] 스폰서십 vs private routing 택일 (동시 사용 불가)
- [ ] 제출 tx를 메인넷으로 낼지 (테스트넷도 스폰서 대상이고 크레딧 무료)

---

## 최근 작업 로그
> 각자 세션 끝날 때 한 줄씩. 무엇을 했고 다음이 뭔지.

- (예시) 8/6 데스크탑: 문서 3종 초기화, Git 세팅. 다음 = Phase A 셋업 시작.
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
