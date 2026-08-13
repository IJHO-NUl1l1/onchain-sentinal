// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Throwaway: reads an arbitrary FTSO feed via the same verified ContractRegistry path
// SentinelVault.sol already uses, to confirm a feed id resolves before wiring it in.
import { TestFtsoV2Interface } from "@flarenetwork/flare-periphery-contracts/coston2/TestFtsoV2Interface.sol";
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";

contract FeedCheck {
    function read(bytes21 feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp) {
        TestFtsoV2Interface ftsoV2 = ContractRegistry.getTestFtsoV2();
        return ftsoV2.getFeedById(feedId);
    }
}
