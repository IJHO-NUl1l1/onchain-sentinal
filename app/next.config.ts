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
};

export default nextConfig;
