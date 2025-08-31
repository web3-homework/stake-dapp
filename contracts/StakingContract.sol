// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingContract
 * @dev 改进的ETH质押合约，支持安全奖励发放
 */
contract StakingContract is ReentrancyGuard, Ownable, Pausable {
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lastRewardTime;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    uint256 public rewardRate = 12; // 年化收益率 12%
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    uint256 public constant PRECISION = 1e18;

    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    // 新增：奖励资金池管理
    uint256 public totalRewardsDeposited;  // 所有者注入的奖励总额
    uint256 public totalRewardsClaimed;    // 已发放的奖励总额

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event ContractPaused(bool paused);
    event RewardsDeposited(uint256 amount);
    event RewardPaymentFailed(address user, uint256 amount); // 新增事件

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
            uint256 reward = (timeElapsed * totalStaked * rewardRate * PRECISION) / (100 * SECONDS_PER_YEAR);
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
            uint256 reward = (timeElapsed * totalStaked * rewardRate * PRECISION) / (100 * SECONDS_PER_YEAR);
            currentRewardPerToken += reward / totalStaked;
        }

        uint256 pending = (userStake.amount * currentRewardPerToken / PRECISION) - userStake.rewardDebt;
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

        _updateReward(msg.sender);

        uint256 rewards = calculateRewards(msg.sender);

        // 更新用户状态
        userStake.amount -= amount;
        userStake.lastRewardTime = block.timestamp;
        userStake.rewardDebt = (userStake.amount * rewardPerTokenStored) / PRECISION;

        if (userStake.amount == 0) {
            delete stakes[msg.sender];
        }

        totalStaked -= amount;

        // 发放奖励（如果足够）
        if (rewards > 0 && rewards <= availableRewardFunds()) {
            totalRewardsClaimed += rewards;
            (bool success, ) = msg.sender.call{value: rewards}("");
            if (success) {
                emit RewardsClaimed(msg.sender, rewards);
            } else {
                emit RewardPaymentFailed(msg.sender, rewards);
                // 保留 rewards 到下次尝试
            }
        }

        // 返还本金
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Unstake: transfer failed");

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
        stakes[msg.sender].lastRewardTime = block.timestamp;
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * rewardPerTokenStored) / PRECISION;

        (bool success, ) = msg.sender.call{value: actualReward}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(msg.sender, actualReward);
    }

    /**
     * @dev 设置奖励率
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 50, "Rate too high");
        _updateReward(address(0));
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
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
     * @dev 可用奖励资金
     */
    function availableRewardFunds() public view returns (uint256) {
        uint256 contractFunds = address(this).balance;
        uint256 stakedPrincipal = totalStaked;
        uint256 claimedRewards = totalRewardsClaimed;
        uint256 maxAvailable = contractFunds > stakedPrincipal + claimedRewards
            ? contractFunds - (stakedPrincipal + claimedRewards)
            : 0;
        return maxAvailable;
    }

    /**
     * @dev 紧急提取：只能提取超出质押本金和已发奖励的部分
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 available = availableRewardFunds();
        require(amount <= available, "Exceeds available funds");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdraw failed");
    }

    // 只读函数
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

    receive() external payable {}
}