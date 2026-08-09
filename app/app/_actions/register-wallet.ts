"use server";

// 대시보드 "감시 시작" 버튼의 서버 쪽 진입점. UI(_components)와 백엔드 로직
// (agent/, executors/)을 잇는 유일한 배선 — 이 파일 밖에서 analyzer나
// KeeperHubExecutor를 직접 부르지 않는다.

import { analyzeWallet } from "../../agent/analyzer";
import { KeeperHubExecutor } from "../../executors/keeperhub";
import type { MonitoringProfile } from "../../executors/types";

export async function registerWallet(address: string): Promise<MonitoringProfile> {
  const profile = await analyzeWallet(address);
  const executor = new KeeperHubExecutor();
  await executor.provisionMonitoring(profile);
  return profile;
}
