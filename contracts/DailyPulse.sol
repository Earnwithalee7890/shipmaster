// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DailyPulse
 * @dev Ultra gas-efficient contract for Celo Proof of Ship daily transitions.
 * Focuses on event emission instead of storage to minimize fees.
 */
contract DailyPulse {
    mapping(address => uint256) public totalCheckIns;
    mapping(address => uint256) public lastCheckIn;

    event Pulse(address indexed builder, uint256 indexed count, uint256 timestamp);

    /**
     * @dev Simple check-in that costs minimal gas (~15k-25k gas).
     * Emits a Pulse event for off-chain tracking (Talent Protocol, etc).
     */
    function checkIn() external {
        totalCheckIns[msg.sender]++;
        lastCheckIn[msg.sender] = block.timestamp;
        
        emit Pulse(msg.sender, totalCheckIns[msg.sender], block.timestamp);
    }

    /**
     * @dev Get total check-ins for multiple builders in one call.
     */
    function getBatchStats(address[] calldata builders) external view returns (uint256[] memory) {
        uint256[] memory counts = new uint256[](builders.length);
        for (uint256 i = 0; i < builders.length; i++) {
            counts[i] = totalCheckIns[builders[i]];
        }
        return counts;
    }
}
