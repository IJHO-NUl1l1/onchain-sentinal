// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// FTSO 가격 피드로 하락을 감지해 스스로 방어하는 금고. architecture.md §2 참조.
// 실제로 네이티브 자산(C2FLR)을 보관한다 — 방어가 플래그가 아니라 자금 동결로 이어진다.
// ⚠️ 개발망(Coston2)이라 getTestFtsoV2()(view, 가스無) 사용 — 메인넷은 getFtsoV2()(payable).

import { TestFtsoV2Interface } from "@flarenetwork/flare-periphery-contracts/coston2/TestFtsoV2Interface.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

contract SentinelVault {
    // ⚠️ app/executors/types.ts의 ActionType과 순서·이름을 동일하게 유지할 것 (인덱스로 매핑된다).
    enum ActionType {
        NO_ACTION,
        INCREASE_MONITORING,
        SUPPLY_COLLATERAL,
        WITHDRAW_COLLATERAL,
        REPAY_DEBT,
        LOCK_POSITION,
        ACCELERATE_ORACLE
    }

    struct Policy {
        bytes21 feedId;
        uint256 anchorPrice; // setPolicy 시점 가격 (decimals 미반영 — 같은 feed끼리 비교라 무관)
        uint256 thresholdBips; // 하락 임계값 (BIPS, 10000 = 100%)
        bool isLocked;
        bool exists;
    }

    /// agentRespond를 호출할 수 있는 유일한 주소. LLM의 영향력을 이 주소 + enum으로만 제한한다.
    address public immutable agent;

    mapping(address user => Policy policy) public policies;

    /// 이 금고가 실제로 들고 있는 예치금. 방어가 발동하면 여기서 나가는 길이 막힌다.
    mapping(address user => uint256 amount) public balances;

    event PolicySet(address indexed user, bytes21 feedId, uint256 anchorPrice, uint256 thresholdBips);
    event ImmediateDefense(address indexed user, uint256 currentPrice, uint256 deviationBips);
    event EscalationRequested(address indexed user, uint256 currentPrice, uint256 deviationBips);
    event AgentResponded(address indexed user, ActionType action);
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    error NotAgent();
    error PolicyNotFound();
    error PositionLocked();
    error InsufficientBalance();
    error TransferFailed();
    error NothingToDeposit();

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(address _agent) {
        agent = _agent;
    }

    /// 금고에 네이티브 자산을 예치한다. 이게 감시·방어의 대상이 되는 실제 포지션이다.
    function deposit() external payable {
        if (msg.value == 0) revert NothingToDeposit();
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, balances[msg.sender]);
    }

    /**
     * 예치금 인출. **정책이 잠겨 있으면 실패한다** — 에이전트(또는 컨트랙트 자신)의 방어 판정이
     * 여기서 실제 효력을 갖는다. `isLocked`는 기록용 플래그가 아니라 자금의 출구를 막는 조건이다.
     * 사용자는 `unlock()`으로 스스로 풀 수 있다(우리가 자산을 인질로 잡지 않는다).
     */
    function withdraw(uint256 amount) external {
        Policy storage policy = policies[msg.sender];
        if (policy.exists && policy.isLocked) revert PositionLocked();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{ value: amount }("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount, balances[msg.sender]);
    }

    /// 감시망 설치. 현재 가격을 기준점으로 잡는다.
    function setPolicy(bytes21 feedId, uint256 thresholdBips) external {
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        (uint256 value, , ) = ftsoV2.getFeedById(feedId);

        policies[msg.sender] = Policy({
            feedId: feedId,
            anchorPrice: value,
            thresholdBips: thresholdBips,
            isLocked: false,
            exists: true
        });

        emit PolicySet(msg.sender, feedId, value, thresholdBips);
    }

    /// 퍼미션리스 — 아무 키퍼나 호출 가능. LLM 무관여, 컨트랙트가 스스로 방어한다.
    function checkAndExecute(address user) external {
        Policy storage policy = policies[user];
        if (!policy.exists) revert PolicyNotFound();
        if (policy.isLocked) return; // 이미 방어 발동, 재실행 불필요

        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        (uint256 currentPrice, , ) = ftsoV2.getFeedById(policy.feedId);

        if (currentPrice >= policy.anchorPrice) return; // 하락 아님, 정상

        uint256 deviationBips = ((policy.anchorPrice - currentPrice) * 10000) / policy.anchorPrice;

        if (deviationBips < policy.thresholdBips) {
            return; // 정상 범위
        }

        // 임계값 2배 이상 = 명백한 위기라 즉시 방어. 그 사이는 회색지대 → 에이전트에게 넘긴다.
        if (deviationBips >= policy.thresholdBips * 2) {
            policy.isLocked = true;
            emit ImmediateDefense(user, currentPrice, deviationBips);
        } else {
            emit EscalationRequested(user, currentPrice, deviationBips);
        }
    }

    /// 회색지대 에스컬레이션에 대한 에이전트의 판단을 반영한다.
    /// 자금 이동이 필요한 액션은 후속 확장 — 지금은 LOCK_POSITION만 처리하고 나머지는 이벤트만 남긴다.
    function agentRespond(address user, ActionType action) external onlyAgent {
        Policy storage policy = policies[user];
        if (!policy.exists) revert PolicyNotFound();

        if (action == ActionType.LOCK_POSITION) {
            policy.isLocked = true;
        }

        emit AgentResponded(user, action);
    }

    /// 사용자가 스스로 방어 상태를 해제 (수동 개입).
    function unlock() external {
        Policy storage policy = policies[msg.sender];
        if (!policy.exists) revert PolicyNotFound();
        policy.isLocked = false;
    }
}
