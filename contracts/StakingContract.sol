// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title StakingContract
 * @dev 一个简单的ETH质押合约，用户可以质押ETH并获得奖励
 */
contract StakingContract is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    // 质押信息结构体
    struct StakeInfo {
        uint256 amount;           // 质押金额
        uint256 timestamp;        // 质押时间戳
        uint256 lastRewardTime;   // 上次领取奖励时间
    }

    // 状态变量
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public rewardRate = 12; // 年化收益率 12%
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    
    // 事件
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);

    constructor() {}

    /**
     * @dev 质押ETH
     */
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Stake amount must be greater than 0");
        
        StakeInfo storage userStake = stakes[msg.sender];
        
        // 如果用户已有质押，先计算并累加奖励
        if (userStake.amount > 0) {
            uint256 pendingRewards = calculateRewards(msg.sender);
            if (pendingRewards > 0) {
                payable(msg.sender).transfer(pendingRewards);
                emit RewardsClaimed(msg.sender, pendingRewards);
            }
        }
        
        // 更新质押信息
        userStake.amount = userStake.amount.add(msg.value);
        userStake.timestamp = block.timestamp;
        userStake.lastRewardTime = block.timestamp;
        
        totalStaked = totalStaked.add(msg.value);
        
        emit Staked(msg.sender, msg.value);
    }

    /**
     * @dev 解质押
     * @param amount 解质押金额
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        require(amount > 0, "Unstake amount must be greater than 0");
        
        // 计算并发放奖励
        uint256 pendingRewards = calculateRewards(msg.sender);
        if (pendingRewards > 0) {
            payable(msg.sender).transfer(pendingRewards);
            emit RewardsClaimed(msg.sender, pendingRewards);
        }
        
        // 更新质押信息
        userStake.amount = userStake.amount.sub(amount);
        userStake.lastRewardTime = block.timestamp;
        
        if (userStake.amount == 0) {
            delete stakes[msg.sender];
        }
        
        totalStaked = totalStaked.sub(amount);
        
        // 返还质押的ETH
        payable(msg.sender).transfer(amount);
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev 领取奖励
     */
    function claimRewards() external nonReentrant {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards available");
        
        stakes[msg.sender].lastRewardTime = block.timestamp;
        
        payable(msg.sender).transfer(rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
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
        
        uint256 stakingDuration = block.timestamp.sub(userStake.lastRewardTime);
        uint256 rewards = userStake.amount
            .mul(rewardRate)
            .mul(stakingDuration)
            .div(100)
            .div(SECONDS_PER_YEAR);
            
        return rewards;
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
     * @dev 设置奖励率（仅所有者）
     * @param newRate 新的年化收益率
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 100, "Reward rate cannot exceed 100%");
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @dev 向合约存入ETH用于支付奖励（仅所有者）
     */
    function depositRewards() external payable onlyOwner {
        require(msg.value > 0, "Deposit amount must be greater than 0");
    }

    /**
     * @dev 提取合约中的ETH（仅所有者，紧急情况使用）
     * @param amount 提取金额
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient contract balance");
        payable(owner()).transfer(amount);
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
