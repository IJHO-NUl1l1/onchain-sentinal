import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app/과 contracts/가 각자 락파일을 가진 구조라 Turbopack이 워크스페이스 루트를 잘못 잡는다.
  // 휴리스틱에 기대지 말고 명시적으로 고정한다.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
