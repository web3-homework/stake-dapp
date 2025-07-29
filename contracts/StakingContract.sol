// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingContract
 * @dev 一个改进的ETH质押合约，用户可以质押ETH并获得奖励
 */
contract StakingContract is ReentrancyGuard, Ownable, Pausable {
    // 质押信息结构体
    struct StakeInfo {
        uint256 amount;           // 质押金额
        uint256 timestamp;        // 质押时间戳
        uint256 lastRewardTime;   // 上次领取奖励时间
        uint256 rewardDebt;       // 奖励债务，用于计算应得奖励
    }

    // 状态变量
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public rewardRate = 12; // 年化收益率 12%
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    uint256 public constant PRECISION = 1e18; // 精度因子
    uint256 public rewardPerTokenStored;      // 每质押单位累计奖励
    uint256 public lastUpdateTime;            // 上次更新时间
    
    // 事件
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);
    event ContractPaused(bool paused);
    event RewardsDeposited(uint256 amount);

    constructor() Ownable(msg.sender) {
        lastUpdateTime = block.timestamp;
    }

    /**
     * @dev 暂停合约（仅所有者）
     */
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(true);
    }

    /**
     * @dev 恢复合约（仅所有者）
     */
    function unpause() external onlyOwner {
        _unpause();
        emit ContractPaused(false);
    }

    /**
     * @dev 更新奖励状态
     */
    function _updateReward(address account) internal {
        if (totalStaked == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        if (timeElapsed <= 0) {
            return;
        }
        
        uint256 reward = (timeElapsed * totalStaked * rewardRate * PRECISION) / (100 * SECONDS_PER_YEAR);
        rewardPerTokenStored = rewardPerTokenStored + (reward / totalStaked);
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            StakeInfo storage userStake = stakes[account];
            userStake.rewardDebt = userStake.amount * rewardPerTokenStored / PRECISION;
        }
    }

    /**
     * @dev 计算用户的待领取奖励
     * @param user 用户地址
     * @return 奖励金额
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 currentRewardPerToken = rewardPerTokenStored;
        if (block.timestamp > lastUpdateTime && totalStaked != 0) {
            uint256 timeElapsed = block.timestamp - lastUpdateTime;
            uint256 reward = (timeElapsed * totalStaked * rewardRate * PRECISION) / (100 * SECONDS_PER_YEAR);
            currentRewardPerToken = currentRewardPerToken + (reward / totalStaked);
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
        
        // 更新质押信息
        if (userStake.amount == 0) {
            // 新质押
            userStake.timestamp = block.timestamp;
        }
        
        userStake.amount += msg.value;
        userStake.lastRewardTime = block.timestamp;
        userStake.rewardDebt = userStake.amount * rewardPerTokenStored / PRECISION;
        
        totalStaked += msg.value;
        
        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev 解质押
     * @param amount 解质押金额
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        require(amount > 0, "Unstake amount must be greater than 0");
        
        _updateReward(msg.sender);
        
        uint256 rewards = calculateRewards(msg.sender);
        
        // 更新质押信息
        userStake.amount -= amount;
        userStake.lastRewardTime = block.timestamp;
        userStake.rewardDebt = userStake.amount * rewardPerTokenStored / PRECISION;
        
        if (userStake.amount == 0) {
            delete stakes[msg.sender];
        }
        
        totalStaked -= amount;
        
        // 发放奖励
        if (rewards > 0) {
            require(address(this).balance >= rewards + amount, "Insufficient contract balance");
            (bool success, ) = msg.sender.call{value: rewards}("");
            require(success, "Failed to send rewards");
            emit RewardsClaimed(msg.sender, rewards);
        }
        
        // 返还质押的ETH
        (bool unstakeSuccess, ) = msg.sender.call{value: amount}("");
        require(unstakeSuccess, "Unstake transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _updateReward(msg.sender);
        
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards available");
        require(address(this).balance >= rewards, "Insufficient contract balance");
        
        stakes[msg.sender].lastRewardTime = block.timestamp;
        stakes[msg.sender].rewardDebt = stakes[msg.sender].amount * rewardPerTokenStored / PRECISION;
        
        (bool success, ) = msg.sender.call{value: rewards}("");
        require(success, "Failed to send rewards");
        
        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @dev 设置奖励率（仅所有者）
     * @param newRate 新的年化收益率
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 50, "Reward rate cannot exceed 50%");
        _updateReward(address(0));
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @dev 向合约存入ETH用于支付奖励（仅所有者）
     */
    function depositRewards() external payable onlyOwner {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        _updateReward(address(0));
        emit RewardsDeposited(msg.value);
    }

    /**
     * @dev 提取合约中的ETH（仅所有者，紧急情况使用）
     * @param amount 提取金额
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        // 只能提取奖励资金，不能提取用户质押资金
        require(amount <= address(this).balance - totalStaked, "Cannot withdraw user staked funds");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed to withdraw");
    }

    /**
     * @dev 获取用户质押金额
     * @param user 用户地址
     * @return 质押金额
     */
    function getStakedAmount(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /**
     * @dev 获取用户待领取奖励
     * @param user 用户地址
     * @return 奖励金额
     */
    function getRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }

    /**
     * @dev 获取合约余额
     * @return 合约ETH余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 接收ETH
     */
    receive() external payable {}
}    