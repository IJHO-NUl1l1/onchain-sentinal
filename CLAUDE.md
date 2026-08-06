# CLAUDE.md — Sentinel 개발 규칙

> 이 파일은 Claude Code가 세션마다 자동으로 읽는다. 여기 담긴 것은 "일하는 법"(규칙)이다.
> "무엇을 만들지"는 `docs/architecture.md`, "지금 어디까지 됐는지"는 `docs/todo.md`에 있다.

---

## ⛔ 작업 시작 전 필수 절차 (건너뛰지 말 것)

어떤 코드 작업이든 시작하기 전에 **반드시 아래를 순서대로 읽어라**:

1. `docs/architecture.md` — 전체 설계, 파트 경계, 확정된 기술 스펙(주소/함수/스키마/함정)
2. `docs/todo.md` — 현재 진행 상황과 다음에 할 작업

이 두 문서를 읽지 않고 코드를 작성하는 것은 **금지**한다.

**추측 금지 규칙**: `architecture.md`에 없는 API 시그니처, 컨트랙트 주소, 함수 이름을 상상해서 채우지 마라. 필요한 값이 문서에 없으면 작업을 멈추고 사용자에게 물어라. 지어낸 주소/시그니처는 이 프로젝트에서 가장 위험한 오류다.

---

## 프로젝트 한 줄 정의

지갑 주소 하나를 주면, AI 에이전트가 그 지갑에 필요한 감시망을 설계해 배치하고, 위기 상황을 진단해 온체인에서 직접 방어하는 자율 가디언. 이름은 **Sentinel**.

핵심 원칙: **판단(LLM)과 실행(결정론적 인프라)의 분리.** LLM은 신뢰성이 필요한 경로(감시·트랜잭션 실행)에 끼지 않는다. 설계·진단만 한다.

---

## 🔑 절대 규칙 (보안)

- **개인키/프라이빗키를 소스코드에 넣지 마라.** 실행 지갑 키, 배포용 키 전부.
- **`.env`를 커밋하지 마라.** `.gitignore`에 반드시 포함. `.env.example`만 커밋한다.
- **KeeperHub API 키(`kh_`), Claude API 키를 코드/문서/커밋에 넣지 마라.**
- 새 파일 만들 때 민감정보가 들어갈 자리는 환경변수 참조로만.

---

## ⚠️ 반복 실수 방지 (함정 목록)

코드 짤 때 매번 확인. 상세는 `docs/architecture.md`의 "확정 기술 스펙" 참조.

**KeeperHub 워크플로우:**
- `abi`는 배열이 아니라 **`JSON.stringify()`한 문자열** (안 하면 조용히 422)
- `functionArgs`는 **JSON 문자열화한 위치 배열**
- `gasLimitMultiplier`는 숫자가 아니라 **문자열**
- `network`는 **문자열 chainId** ("1", "11155111", "8453")
- deadline 등은 템플릿 산술 말고 **미리 계산**해서 주입

- `simulate`는 반대로 **JSON 불리언** `true` (문자열 아님). 실제 실행은 고유 `idempotency_key` 필요
- 수신 주소는 **엄격한 EIP-55 체크섬** 검증 — 전부 소문자로 넘기거나 정확한 체크섬으로

**Flare 컨트랙트:**
- **EVM 버전 반드시 `cancun`** (foundry.toml / hardhat.config). 안 맞추면 컴파일/배포 실패
- 개발은 `getTestFtsoV2()`(view, 가스無), 배포는 `getFtsoV2()`(payable)로 전환
- Coston2 chainId는 **114**

**도구/환경:**
- **PowerShell here-string(`@'...'@`)은 Bash 툴에서 안 된다** (반대도 마찬가지). 실제로 `.gitignore`가
  생성 명령문 그대로 기록돼 시크릿 보호가 뚫린 사고가 있었다. **파일을 만들었으면 열어서 확인하라.**
- 슬래시 명령(`/mcp` 등)은 Claude Code 안에서 치는 것. 터미널에 치면 `CommandNotFoundException`.

---

## 개발 방식

- **런타임**: Claude Desktop/Code + MCP로 판단·실행 시연. 무거운 프레임워크(ElizaOS 등) 쓰지 마라. Claude API + 서버 자동화는 로드맵(지금 구현 대상 아님).
- **지갑**: 감시 대상은 주소 문자열 입력만. 메타마스크/지갑 연동 UI를 만들지 마라. 실행 지갑은 Turnkey(KeeperHub) / 컨트랙트(Flare)의 자동 서명.
- **Executor 경계**: 에이전트/백엔드 몸통은 `Executor` 인터페이스만 안다. 에이전트 코드 안에 KeeperHub/Flare 분기(`if target === ...`)를 넣지 마라. 실행 방식 차이는 executor 구현체 안에만 존재해야 한다.

---

## 파일/작업 규칙

- 공유 코드(두뇌·대시보드·몸통)를 수정할 때 특정 executor에 종속된 로직을 섞지 마라.
- KeeperHub 전용 코드는 `executors/keeperhub.ts`에, Flare 전용은 `executors/flare.ts`와 컨트랙트에만.
- 작업을 끝내면 `docs/todo.md`의 해당 항목을 업데이트하고 커밋하라. (두 기기가 이걸로 동기화한다)
- todo를 업데이트할 때 `architecture.md`를 건드리지 마라. 성격이 다른 문서다.

---

## 두 기기 개발 (집 랩탑 / 회사 데스크탑)

- 모든 코드/문서는 Git으로 동기화. 작업 전 `git pull`, 작업 후 `git push`.
- 세션 시작 시 `docs/todo.md`를 먼저 읽어 상대 기기가 어디까지 했는지 확인하라.
- Node 버전(`.nvmrc` = 24.15.0), EVM 버전(cancun) 등 환경을 두 기기에서 동일하게 유지.

**git이 안 옮겨주는 것 — 기기마다 따로 해야 한다:**
- `.env` 실제 키값 (`.gitignore`로 차단. `copy .env.example .env` 후 안전한 경로로 값 이전)
- KeeperHub MCP 연결 (`--scope user`라 `~/.claude.json`에 저장)
  → `claude mcp add --transport http --scope user keeperhub https://app.keeperhub.com/mcp`
  → **Claude Code 세션 안에서** `/mcp` 로 OAuth. `claude mcp list`로 `Connected` 확인
- `node_modules/` → `npm install --prefix app`

---

## 막혔을 때

- 필요한 기술 값이 `architecture.md`에 없다 → 지어내지 말고 사용자에게 질문.
- KeeperHub/Flare 문서 확인이 필요하다 → 사용자에게 해당 문서를 요청 (URL 뒤 `.md`로 가져올 수 있음).
- 스코프가 커진다 싶으면 → `architecture.md`의 "스코프 밸브" 순서를 따르라. KeeperHub는 완성도 우선, Flare는 최소 성립선부터.
