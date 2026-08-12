// 🟢 Claude API 호출. `prompt.ts`가 조립한 프롬프트를 모델에 보낸다.

import Anthropic from "@anthropic-ai/sdk";
import { ACTION_TYPES } from "../executors/types";
import { SEVERITIES } from "./types";

// ⚠️ 키는 환경변수로만. SDK가 ANTHROPIC_API_KEY를 자동으로 찾는다.
const MODEL = "claude-opus-5";

/** 응답 형식을 강제한다. enum은 단일 출처를 스프레드 — 목록을 베끼면 한쪽만 바뀐다. */
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
    // SDK 에러를 그대로 던지면 화면에 JSON 덩어리가 뜬다. 흔한 것들은 한 줄로 바꾼다.
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
