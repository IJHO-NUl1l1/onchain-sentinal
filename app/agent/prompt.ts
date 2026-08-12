// 🟢 프롬프트 .md와 실데이터를 합쳐 API에 넣을 문자열을 만들고, 돌아온 응답을 검증한다.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isSeverity, type Severity } from "./types";
import { isActionType, type ActionType, type MonitoringProfile } from "../executors/types";

// 실행 위치에 따라 cwd가 달라진다(Next 서버는 app/, 스크립트는 레포 루트). 후보를 순서대로 훑는다.
const PROMPT_DIRS = [
  join(process.cwd(), "agent", "prompts"),
  join(process.cwd(), "app", "agent", "prompts"),
  join(__dirname, "prompts"),
];

function readTemplate(name: string): string {
  for (const dir of PROMPT_DIRS) {
    try {
      return readFileSync(join(dir, name), "utf-8");
    } catch {}
  }
  throw new Error(`prompt template not found: ${name} (looked in ${PROMPT_DIRS.join(", ")})`);
}

/** diagnoser + strategist를 한 프롬프트로 합쳐 한 번의 호출로 최종 판정까지 받는다. */
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

/** 모델 응답을 검증한다. `action`이 enum 밖이면 무조건 거부 — 안전장치의 핵심. */
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
