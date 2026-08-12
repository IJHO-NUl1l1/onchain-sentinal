// 🟢 프롬프트 조립. architecture.md §0-1 "2번 축"을 실제로 API에 넣을 수 있는 문자열로
// 만드는 코드 — 사람이 손으로 .md 내용과 데이터를 합치던 걸 대신한다.
//
// 왜 필요한가(8/11): diagnoser.ts/strategist.ts의 함수 바디는 여전히 stub이다(API+서버는
// 로드맵). 근데 "API 키만 연결하면 그대로 돌아간다"는 주장이 참이려면, 사람이 대신하는 일이
// "완성된 문자열을 API로 보내기" 하나여야 한다. 프롬프트 조립까지 사람이 손으로 하면 그 주장이
// 거짓이 된다 — 그래서 조립은 여기 코드가 하고, 콘솔은 이 함수의 결과를 그대로 보여준다.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isSeverity, type Severity } from "./types";
import { isActionType, type ActionType, type MonitoringProfile } from "../executors/types";

// 프롬프트 .md 는 디스크에서 읽는다. 읽는 쪽이 어디서 실행되느냐에 따라 cwd가 달라서
// (Next 서버는 app/, 레포 루트에서 돌린 스크립트는 c:\onchain-sentinel) 후보를 순서대로 훑는다.
// 8/12: cwd 하나만 보고 있다가 루트에서 스크립트를 돌리자 ENOENT로 터졌다.
const PROMPT_DIRS = [
  join(process.cwd(), "agent", "prompts"),
  join(process.cwd(), "app", "agent", "prompts"),
  join(__dirname, "prompts"),
];

function readTemplate(name: string): string {
  for (const dir of PROMPT_DIRS) {
    try {
      return readFileSync(join(dir, name), "utf-8");
    } catch {
      // 다음 후보로
    }
  }
  throw new Error(`prompt template not found: ${name} (looked in ${PROMPT_DIRS.join(", ")})`);
}

/**
 * diagnoser + strategist 두 프롬프트를 하나로 합친다. 원래는 두 번의 개별 LLM 호출인데,
 * 콘솔이 검증란을 하나만 두고 있어서(8/11 UI 설계) 한 번의 응답으로 최종 판정까지 받는다 —
 * 두 파일의 지시문은 그대로 두고 마지막에 "최종 출력은 이거 하나"라는 통합 지시만 덧붙인다.
 * (자동화 단계에서 diagnoser/strategist를 실제로 분리 호출하게 되면 이 함수도 둘로 쪼갠다.)
 */
export function buildAgentPrompt(profile: MonitoringProfile, currentStateJson: string): string {
  const diagnoser = readTemplate("diagnoser.md");
  const strategist = readTemplate("strategist.md");

  return [
    diagnoser,
    "\n---\n",
    strategist,
    "\n---\n",
    "## Input for this run\n",
    "Risk profile (from `analyzeWallet`):",
    "```json",
    JSON.stringify(profile, null, 2),
    "```",
    "",
    "Current onchain state (from `getAaveAccountData`, read moments ago):",
    "```json",
    currentStateJson,
    "```",
    "",
    "## Final output",
    "",
    "Do not return the diagnoser output on its own. Reason through both stages, then answer with",
    "only this combined JSON object (no other text):",
    "",
    "```json",
    '{ "severity": "...", "diagnosis": "...", "action": "...", "rationale": "..." }',
    "```",
  ].join("\n");
}

export interface Verdict {
  severity: Severity;
  diagnosis: string;
  action: ActionType;
  rationale: string;
}

/** strategist 단계가 낸 결과를 검증한다 — 프롬프트의 "부탁"이 아니라 코드가 실제로
 * 강제하는 지점. `action`이 enum 밖이면 무조건 거부한다(이게 안전장치의 핵심). */
export function parseVerdict(raw: string): { ok: true; verdict: Verdict } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Expected a JSON object" };
  }
  const v = value as Record<string, unknown>;
  if (typeof v.severity !== "string" || !isSeverity(v.severity)) {
    return { ok: false, error: `"severity" must be one of low/medium/high/critical` };
  }
  if (typeof v.diagnosis !== "string") {
    return { ok: false, error: `"diagnosis" must be a string` };
  }
  if (typeof v.action !== "string" || !isActionType(v.action)) {
    return {
      ok: false,
      error: `"action" must be one of the enum values in strategist.md — got ${JSON.stringify(v.action)}`,
    };
  }
  if (typeof v.rationale !== "string") {
    return { ok: false, error: `"rationale" must be a string` };
  }
  return { ok: true, verdict: { severity: v.severity, diagnosis: v.diagnosis, action: v.action, rationale: v.rationale } };
}
