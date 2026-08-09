// Phase 2 반자동 데모의 마지막 단계용 러너: strategist가 고른 액션을 실제로 실행.
// docs/todo.md Phase C "Phase 2 반자동 데모" 참조.
//
// 흐름: prompts/diagnoser.md → prompts/strategist.md를 Claude Code 세션에 직접
// 넣어서 { action, rationale } JSON을 받은 다음, 그 action을 이 스크립트로 실행한다.
//
// 사용법: npm run demo:execute -- <ACTION_TYPE> '{"asset":"0x...","amount":"1","onBehalfOf":"0x..."}'
// 예:     npm run demo:execute -- SUPPLY_COLLATERAL '{"asset":"0x...","amount":"1","onBehalfOf":"0x2b33afb068a77b103fFAF0b7d9F128209076BcE3"}'

import { KeeperHubExecutor } from "../executors/keeperhub";
import type { Action, ActionType } from "../executors/types";

function isKnownActionType(value: string): value is ActionType {
  const known: ActionType[] = [
    "NO_ACTION",
    "INCREASE_MONITORING",
    "SUPPLY_COLLATERAL",
    "WITHDRAW_COLLATERAL",
    "REPAY_DEBT",
    "LOCK_POSITION",
    "ACCELERATE_ORACLE",
  ];
  return (known as string[]).includes(value);
}

async function main() {
  const [actionType, paramsJson] = process.argv.slice(2);
  if (!actionType) {
    console.error(
      `사용법: npm run demo:execute -- <ACTION_TYPE> '{"asset":"0x...","amount":"1"}'`,
    );
    process.exit(1);
  }
  if (!isKnownActionType(actionType)) {
    console.error(`알 수 없는 액션: "${actionType}" — architecture.md §10 표에 없음`);
    process.exit(1);
  }

  const params = paramsJson ? JSON.parse(paramsJson) : {};
  const action: Action = { type: actionType, params };

  console.log("[executor] 실행:", action);
  const executor = new KeeperHubExecutor();
  const result = await executor.execute(action);
  console.log("[executor] 결과:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
