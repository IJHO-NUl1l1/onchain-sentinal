# strategist 프롬프트

diagnoser의 출력을 받아 액션을 고르는 단계. **출력은 반드시 아래 enum 중 하나로만
제한한다** — 이게 CLAUDE.md 핵심 원칙("LLM은 판단만, 실행은 결정론적 executor가 함")을
지키는 안전장치다. enum 밖의 문자열이 나오면 executor가 실행을 거부한다.

## 입력

- diagnoser의 출력: `{ severity, diagnosis }`
- 리스크 프로파일: `{ walletAddress, assets }`

## 액션 enum (architecture.md §10과 동일해야 함 — 여기서 새 값을 만들지 마라)

| 액션 | 언제 고르나 |
|---|---|
| `NO_ACTION` | severity가 low, 조치 불필요 |
| `INCREASE_MONITORING` | medium. 아직 실질적 위험은 아니지만 추이를 더 봐야 함 |
| `SUPPLY_COLLATERAL` | 담보 비율을 높여야 청산을 피할 수 있을 때 |
| `WITHDRAW_COLLATERAL` | 담보를 안전한 곳으로 빼야 할 때 (프로토콜 자체가 위험할 때 등) |
| `REPAY_DEBT` | 부채를 줄여야 청산을 피할 수 있을 때 |
| `LOCK_POSITION` | critical. 즉시 포지션을 동결해야 손실을 막을 수 있을 때 |
| `ACCELERATE_ORACLE` | 가격 급변으로 오라클이 실제 가격을 못 따라가고 있다고 판단될 때 (Flare 전용 — KeeperHub에서는 선택하지 마라) |

`borrow`, `set-collateral` 같은 액션은 의도적으로 이 목록에 없다 — 방어용
에이전트가 리스크를 더 늘리는 선택을 할 이유가 없어서 제외했다. 마찬가지로
이 표에 없는 액션은 만들어내지 마라.

## 출력 (JSON만)

```json
{
  "action": "NO_ACTION | INCREASE_MONITORING | SUPPLY_COLLATERAL | WITHDRAW_COLLATERAL | REPAY_DEBT | LOCK_POSITION | ACCELERATE_ORACLE",
  "rationale": "string — 왜 이 액션인지, 왜 다른 액션이 아닌지"
}
```
