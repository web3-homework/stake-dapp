// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingContract
 * @dev 改进的ETH质押合约，支持安全奖励发放和用户奖励记录
 */
contract StakingContract is ReentrancyGuard, Ownable, Pausable {
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lastRewardTime;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(address => uint256) public totalClaimedRewards; // 用户累计领取奖励

    uint256 public totalStaked;

    uint256 public rewardRateBps = 1200; // 年化收益率 12% (以 basis points 表示)
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    uint256 public constant PRECISION = 1e18;

    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    // 奖励资金池管理
    uint256 public totalRewardsDeposited;
    uint256 public totalRewardsClaimed;

    // 记录发放失败的奖励（可选重试）
    mapping(address => uint256) public pendingRewardPayouts;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRateBps);
    event ContractPaused(bool paused);
    event RewardsDeposited(uint256 amount);
    event RewardPaymentFailed(address indexed user, uint256 amount);
    event RewardWithdrawn(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {
        lastUpdateTime = block.timestamp;
    }

    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(true);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ContractPaused(false);
    }

    /**
     * @dev 更新全局奖励状态
     */
    function _updateReward(address account) internal {
        if (totalStaked == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed > 0) {
            uint256 reward = (timeElapsed * totalStaked * rewardRateBps * PRECISION) / (10000 * SECONDS_PER_YEAR);
            rewardPerTokenStored += reward / totalStaked;
            lastUpdateTime = block.timestamp;
        }

        if (account != address(0)) {
            StakeInfo storage user = stakes[account];
            user.rewardDebt = (user.amount * rewardPerTokenStored) / PRECISION;
        }
    }

    /**
     * @dev 计算用户待领取奖励
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;

        uint256 currentRewardPerToken = rewardPerTokenStored;
        if (block.timestamp > lastUpdateTime && totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - lastUpdateTime;
            uint256 reward = (timeElapsed * totalStaked * rewardRateBps * PRECISION) / (10000 * SECONDS_PER_YEAR);
            currentRewardPerToken += reward / totalStaked;
        }

        uint256 pending = ((userStake.amount * currentRewardPerToken) / PRECISION) - userStake.rewardDebt;
        return pending;
    }

    /**
     * @dev 质押ETH
     */
    function stake() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Stake amount must be greater than 0");

        _updateReward(msg.sender);

        StakeInfo storage userStake = stakes[msg.sender];
        if (userStake.amount == 0) {
            userStake.timestamp = block.timestamp;
        }

        userStake.amount += msg.value;
        userStake.lastRewardTime = block.timestamp;
        userStake.rewardDebt = (userStake.amount * rewardPerTokenStored) / PRECISION;

        totalStaked += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev 解质押
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Unstake amount must be greater than 0");
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");

        uint256 pendingRewards = calculateRewards(msg.sender);

        // 2. 更新状态
        userStake.amount -= amount;
        userStake.lastRewardTime = block.timestamp;

        if (userStake.amount == 0) {
            delete stakes[msg.sender];
        }

        totalStaked -= amount;

        // 3. 更新 rewardDebt（基于新状态）
        _updateReward(msg.sender);

        // 4. 发放奖励
        uint256 actualReward = 0;
        if (pendingRewards > 0) {
            uint256 available = availableRewardFunds();
            actualReward = (pendingRewards > available) ? available : pendingRewards;
            if (actualReward > 0) {
                totalRewardsClaimed += actualReward;
                totalClaimedRewards[msg.sender] += actualReward;
            }
        }

        uint256 totalPayout = amount + actualReward;
        (bool success, ) = msg.sender.call{value: totalPayout}("");
        require(success, "Unstake: transfer failed");

        if (actualReward > 0) {
            emit RewardsClaimed(msg.sender, actualReward);
        }

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _updateReward(msg.sender);

        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");

        uint256 available = availableRewardFunds();
        require(available > 0, "No reward funds available");

        uint256 actualReward = rewards > available ? available : rewards;

        totalRewardsClaimed += actualReward;
        totalClaimedRewards[msg.sender] += actualReward; // 记录用户累计领取

        stakes[msg.sender].lastRewardTime = block.timestamp;
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * rewardPerTokenStored) / PRECISION;

        (bool success, ) = msg.sender.call{value: actualReward}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, actualReward);
    }

    /**
     * @dev 设置奖励率（basis points）
     */
    function setRewardRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= 5000, "Rate too high (max 50%)");
        _updateReward(address(0));
        rewardRateBps = newRateBps;
        emit RewardRateUpdated(newRateBps);
    }

    /**
     * @dev 存入奖励资金
     */
    function depositRewards() external payable onlyOwner {
        require(msg.value > 0, "Zero deposit");
        _updateReward(address(0));
        totalRewardsDeposited += msg.value;
        emit RewardsDeposited(msg.value);
    }

    /**
     * @dev 可用奖励资金 = 已注入 - 已发放
     */
    function availableRewardFunds() public view returns (uint256) {
        return totalRewardsDeposited - totalRewardsClaimed;
    }

    /**
     * @dev 紧急提取：只能提取未使用的奖励资金
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 available = availableRewardFunds();
        require(amount <= available, "Exceeds available funds");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdraw failed");
        totalRewardsDeposited -= amount;
    }

    /**
     * @dev 提取因转账失败而挂起的奖励（由用户或任何人调用）
     */
    function withdrawPendingReward() external nonReentrant {
        uint256 amount = pendingRewardPayouts[msg.sender];
        require(amount > 0, "No pending rewards");

        pendingRewardPayouts[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (success) {
            emit RewardWithdrawn(msg.sender, amount);
        } else {
            // 如果再次失败，退回余额
            pendingRewardPayouts[msg.sender] = amount;
        }
    }

    function getStakedAmount(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    function getRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getRewardStats() external view returns (uint256 deposited, uint256 claimed, uint256 available) {
        deposited = totalRewardsDeposited;
        claimed = totalRewardsClaimed;
        available = availableRewardFunds();
    }

    // 查询用户累计领取奖励
    function getUserTotalClaimedRewards(address user) external view returns (uint256) {
        return totalClaimedRewards[user];
    }

    receive() external payable {}
}
