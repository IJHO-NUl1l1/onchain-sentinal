import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app/과 contracts/가 각자 락파일을 가진 구조라 Turbopack이 워크스페이스 루트를 잘못 잡는다.
  // 휴리스틱에 기대지 말고 명시적으로 고정한다.
  turbopack: {
    root: path.join(__dirname),
  },
  // next dev가 app/ 안에 CLAUDE.md·AGENTS.md를 자동 생성한다. 루트 CLAUDE.md가 이 레포의
  // 규칙 파일인데 하위에 또 생기면 지시가 갈리므로 끈다.
  agentRules: false,

  // prompt.ts가 프롬프트 .md를 런타임에 readFileSync로 읽는데, 경로를 문자열로 조립해서
  // Next의 정적 추적이 못 본다 → 서버리스 번들에서 누락돼 배포판에서만 3막이 깨진다.
  // 명시적으로 포함시킨다. (로컬은 디스크에 파일이 있어서 이 설정 없이도 돌아가 눈치채기 어렵다)
  outputFileTracingIncludes: {
    "/**": ["./agent/prompts/**"],
  },
};

export default nextConfig;
