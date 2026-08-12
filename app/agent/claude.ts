// 🟢 Claude API 호출. `prompt.ts`가 조립한 완성된 프롬프트를 실제로 모델에 보낸다.
//
// 이 파일이 생기기 전까지 사람이 대신하던 유일한 단계가 이것이다 —
// 문자열을 복사해 Claude에 붙여넣고 답을 다시 붙여넣는 일. 조립(buildAgentPrompt)과
// 검증(parseVerdict)은 이미 코드였으니, 이 한 칸을 채우면 읽기→판단→실행이
// 사람 없이 한 번에 돈다. architecture.md §2 "런타임"의 로드맵 항목이 여기서 닫힌다.

import Anthropic from "@anthropic-ai/sdk";
import { ACTION_TYPES } from "../executors/types";
import { SEVERITIES } from "./types";

// 키는 환경변수에서만 읽는다(SDK가 ANTHROPIC_API_KEY를 자동으로 찾는다).
// ⚠️ 키를 소스·문서·커밋에 넣지 마라 (CLAUDE.md 절대 규칙).
const MODEL = "claude-opus-5";

/**
 * 응답을 JSON 스키마로 강제한다. `parseVerdict`의 검증을 대체하는 게 아니라 이중으로 건다 —
 * 스키마는 모델이 형식을 지키게 하고, `parseVerdict`는 그래도 어긋난 게 오면 거부한다.
 * "액션은 enum 밖으로 못 나간다"가 프롬프트의 부탁이 아니라 두 겹의 코드로 강제되는 지점.
 */
const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: [...SEVERITIES] },
    diagnosis: { type: "string" },
    action: { type: "string", enum: [...ACTION_TYPES] },
    rationale: { type: "string" },
  },
  required: ["severity", "diagnosis", "action", "rationale"],
  additionalProperties: false,
} as const;

/** 완성된 프롬프트를 Claude에 보내고 응답 텍스트를 그대로 돌려준다. */
export async function askAgent(prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("askAgent: ANTHROPIC_API_KEY is not set (put it in app/.env)");
  }

  const client = new Anthropic();

  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: VERDICT_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    // SDK 에러를 그대로 던지면 콘솔에 JSON 덩어리가 뜬다. 흔한 두 가지는 한 줄로 바꿔준다
    // (데모 중에 화면에 뜨는 문구다 — 영어로 쓸 것, CLAUDE.md 언어 규칙).
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        throw new Error("askAgent: ANTHROPIC_API_KEY was rejected (401) — check the key in app/.env");
      }
      if (err.status === 400 && /credit balance/i.test(err.message)) {
        throw new Error("askAgent: the Anthropic account has no credits — top up at console.anthropic.com");
      }
      throw new Error(`askAgent: Anthropic API error ${err.status} — ${err.message}`);
    }
    throw err;
  }

  // 안전 분류기가 요청을 거절하면 content가 비거나 부분적일 수 있다 — 먼저 확인한다.
  if (message.stop_reason === "refusal") {
    throw new Error("askAgent: the model declined this request (stop_reason: refusal)");
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text) {
    throw new Error(`askAgent: no text in response (stop_reason: ${message.stop_reason})`);
  }
  return text;
}
