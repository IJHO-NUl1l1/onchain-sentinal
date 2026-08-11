import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모노레포(app/ + contracts/, 둘 다 별개 package-lock.json)에서 Turbopack이 워크스페이스
  // 루트를 잘못 잡는 걸 막는다 — 락파일 휴리스틱에 기대지 말고 명시적으로 이 디렉터리로 고정.
  // (8/11: 루트에 있던 빈 package-lock.json을 지웠더니 이게 필요해짐)
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
