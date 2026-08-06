# setup.md — 개발 환경 세팅 (두 기기 공통)

> 새 기기에서 처음 시작할 때, 또는 환경이 꼬였을 때 이 문서대로 따라 하면 된다.
> "무엇을 만들지"는 `architecture.md`, "어디까지 됐는지"는 `todo.md`, "일하는 법"은 `/CLAUDE.md`.
>
> 최초 작성 8/6 (기기1 = Windows 10 Pro / PowerShell). 기기2 세팅하면서 다른 점이 있으면 이 문서를 고쳐라.

---

## 0. git이 안 옮겨주는 것 (중요)

아래 3가지는 **레포에 안 들어간다.** 기기마다 따로 해야 한다. 이걸 모르면 "clone 했는데 왜 안 되지"에서 막힌다.

| 항목 | 왜 안 옮겨지나 | 어떻게 |
|---|---|---|
| `.env` 의 실제 키값 | `.gitignore`로 막아둠 (의도된 것) | 안전한 경로로 직접 이전. 채팅·커밋·이슈에 붙여넣지 말 것 |
| KeeperHub MCP 연결 | `--scope user`라 `~/.claude.json`에 저장 | 아래 3번을 기기마다 재실행 (OAuth 포함) |
| `node_modules/` | `.gitignore` | `npm install` |

---

## 1. 레포 가져오기

```powershell
git clone https://github.com/IJHO-NUl1l1/onchain-sentinal.git
cd onchain-sentinal
```

> 레포명 철자 주의: `onchain-sentinal` (원격 저장소명이 이렇게 만들어져 있다. 로컬 폴더명은 `onchain-sentinel`이어도 무방)

## 2. Node / 의존성

**Node 24.15.0** 으로 통일한다. (`.nvmrc`에 명시, `app/package.json`의 `engines`에도 핀)

```powershell
nvm use          # .nvmrc 를 읽는다. 없으면: nvm install 24.15.0
node -v          # v24.15.0 확인
npm install --prefix app
npm run build --prefix app   # 통과해야 정상 (Next 16.3.0 / Turbopack)
```

기기1 확인 값: Node v24.15.0 / npm 11.12.1 / 빌드 성공.

## 3. KeeperHub MCP 연결 (기기마다 1회)

```powershell
claude mcp add --transport http --scope user keeperhub https://app.keeperhub.com/mcp
```

그다음 **Claude Code 세션 안에서** (PowerShell 프롬프트가 아니다) `/mcp` 입력
→ `keeperhub` 선택 → Enter → 인증 → 브라우저 로그인.

```powershell
claude mcp list   # keeperhub 가 Connected 여야 함
```

- `needs authentication` = 등록은 됐고 OAuth만 남은 상태.
- 브라우저가 원하는 것과 다르게 열리면: Windows 기본 브라우저를 바꾸거나(`ms-settings:defaultapps`),
  터미널에 출력된 인증 URL을 원하는 브라우저에 직접 붙여넣는다. Claude Code에는 브라우저 지정 설정이 없다.
- `claude.ai Gmail / Google Calendar / Google Drive`가 `needs authentication`으로 떠도 **무시**한다. 이 프로젝트와 무관.

## 4. 환경변수

```powershell
copy .env.example .env
```

값을 채운다. 변수 설명은 `.env.example` 주석 참조.
`.env.example`은 커밋 대상이고 `.env`는 절대 아니다 (`.gitignore`에서 `.env*` 차단 + `!.env.example` 예외).

> 지갑 주소·integrationId 같은 확정 값은 `architecture.md` "확정 기술 스펙"에만 둔다. 여기 복사하지 않는다(낡는다).

---

## 이 환경에서 밟은 지뢰 (재발 방지)

- **PowerShell here-string(`@'...'@`)은 Bash에서 안 된다.** 반대도 마찬가지.
  실제로 `.gitignore`가 here-string 명령문 그대로 파일에 기록돼 시크릿 보호가 안 되던 사고가 있었다(7e7acf8에서 수정).
  파일을 만들었으면 **내용을 열어서 확인**할 것.
- 줄바꿈: `.gitattributes`로 레포 내부는 LF 고정. Windows 스크립트(`.cmd`/`.bat`/`.ps1`)만 CRLF.
  이미 설정돼 있으니 `core.autocrlf` 값이 기기마다 달라도 diff가 터지지 않는다.
- `git`은 빈 디렉터리를 추적하지 않는다. `contracts/`가 비어 보이면 `.gitkeep` 때문이다(정상).
- 슬래시 명령(`/mcp`, `/model` 등)은 **Claude Code 안에서** 치는 것. 터미널에 치면 `CommandNotFoundException`.

---

세팅이 끝나면 `docs/todo.md`로 간다. 매 세션 루틴과 커밋 규칙은 `/CLAUDE.md`에 있다.
