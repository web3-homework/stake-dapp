const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingContract", function () {
  // 定义常量
  const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
  const INITIAL_REWARD_RATE = 12; // 12% 年化收益率
  const PRECISION = ethers.parseUnits("1", 18);

  // 部署合约的测试夹具
  async function deployStakingContractFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = await StakingContract.deploy();

    return { stakingContract, owner, user1, user2, user3 };
  }

  // 辅助函数：计算预期奖励
  function calculateExpectedRewards(amount, duration, rewardRate) {
    return (amount * BigInt(rewardRate) * duration * PRECISION) / (100n * BigInt(YEAR_IN_SECONDS) * PRECISION);
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { stakingContract, owner } = await loadFixture(deployStakingContractFixture);
      expect(await stakingContract.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct reward rate", async function () {
      const { stakingContract } = await loadFixture(deployStakingContractFixture);
      expect(await stakingContract.rewardRate()).to.equal(INITIAL_REWARD_RATE);
    });
  });

  describe("Staking", function () {
    it("Should stake ETH and update user stake", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");

      await expect(stakingContract.connect(user1).stake({ value: stakeAmount }))
        .to.emit(stakingContract, "Staked")
        .withArgs(user1.address, stakeAmount);

      const userStake = await stakingContract.stakes(user1.address);
      expect(userStake.amount).to.equal(stakeAmount);
      expect(await stakingContract.totalStaked()).to.equal(stakeAmount);
    });

    it("Should not allow zero stake", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      await expect(stakingContract.connect(user1).stake({ value: 0 })).to.be.revertedWith(
        "Stake amount must be greater than 0"
      );
    });

    it("Should allow multiple stakes", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount1 = ethers.parseEther("1");
      const stakeAmount2 = ethers.parseEther("2");

      await stakingContract.connect(user1).stake({ value: stakeAmount1 });
      await stakingContract.connect(user1).stake({ value: stakeAmount2 });

      const userStake = await stakingContract.stakes(user1.address);
      expect(userStake.amount).to.equal(stakeAmount1 + stakeAmount2);
      expect(await stakingContract.totalStaked()).to.equal(stakeAmount1 + stakeAmount2);
    });
  });

  describe("Unstaking", function () {
    it("Should unstake ETH and update user stake", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("2");
      const unstakeAmount = ethers.parseEther("1");

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(YEAR_IN_SECONDS / 12); // 增加1个月时间

      await expect(stakingContract.connect(user1).unstake(unstakeAmount))
        .to.emit(stakingContract, "Unstaked")
        .withArgs(user1.address, unstakeAmount);

      const userStake = await stakingContract.stakes(user1.address);
      expect(userStake.amount).to.equal(stakeAmount - unstakeAmount);
      expect(await stakingContract.totalStaked()).to.equal(stakeAmount - unstakeAmount);
    });

    it("Should not allow unstaking more than staked", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");
      const unstakeAmount = ethers.parseEther("2");

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await expect(stakingContract.connect(user1).unstake(unstakeAmount)).to.be.revertedWith(
        "Insufficient staked amount"
      );
    });

    it("Should delete user stake when fully unstaked", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(YEAR_IN_SECONDS / 12); // 增加1个月时间

      await stakingContract.connect(user1).unstake(stakeAmount);

      const userStake = await stakingContract.stakes(user1.address);
      expect(userStake.amount).to.equal(0);
      expect(await stakingContract.totalStaked()).to.equal(0);
    });
  });

  describe("Rewards", function () {
    it("Should calculate correct rewards after staking period", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");
      const duration = YEAR_IN_SECONDS / 4; // 3个月

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(duration);

      const expectedRewards = calculateExpectedRewards(stakeAmount, BigInt(duration), INITIAL_REWARD_RATE);
      const actualRewards = await stakingContract.getRewards(user1.address);

      // 考虑到舍入误差，使用近似比较
      expect(actualRewards).to.be.closeTo(expectedRewards, expectedRewards / 1000n);
    });

    it("Should allow claiming rewards", async function () {
      const { stakingContract, user1, owner } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");
      const duration = YEAR_IN_SECONDS / 4; // 3个月

      // 所有者存入奖励资金（增加更多奖励以确保足够支付）
      await stakingContract.connect(owner).depositRewards({ value: ethers.parseEther("2") });

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(duration);

      // 增加奖励计算验证
      const contractBalanceBefore = await ethers.provider.getBalance(stakingContract.target);
      const expectedRewards = calculateExpectedRewards(stakeAmount, BigInt(duration), INITIAL_REWARD_RATE);
      console.log(`Expected rewards: ${expectedRewards}, Contract balance: ${contractBalanceBefore}`);

      await expect(stakingContract.connect(user1).claimRewards())
        .to.emit(stakingContract, "RewardsClaimed")
        .withArgs(user1.address, anyValue);

      const userRewardsAfterClaim = await stakingContract.getRewards(user1.address);
      expect(userRewardsAfterClaim).to.be.lt(expectedRewards / 1000n); // 奖励应该接近0
    });

    it("Should handle multiple users staking at different times", async function () {
      const { stakingContract, user1, user2, owner } = await loadFixture(deployStakingContractFixture);
      const stakeAmount1 = ethers.parseEther("1");
      const stakeAmount2 = ethers.parseEther("2");
      const halfYear = YEAR_IN_SECONDS / 2;

      // 所有者存入奖励资金
      const depositTx = await stakingContract.connect(owner).depositRewards({ value: ethers.parseEther("1") });
      await depositTx.wait();
      const contractBalance = await ethers.provider.getBalance(stakingContract.target);
      console.log(`Contract balance after deposit: ${contractBalance}`);

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      const initialTime = Math.floor(Date.now() / 1000);
      await time.increase(duration);
      const finalTime = Math.floor(Date.now() / 1000);
      console.log(`Staked for ${finalTime - initialTime} seconds`);
      console.log(`Stake amount: ${stakeAmount}, Reward rate: ${INITIAL_REWARD_RATE}`);
      await time.increase(halfYear); // 6个月后

      // User2质押
      await stakingContract.connect(user2).stake({ value: stakeAmount2 });
      await time.increase(halfYear); // 又过了6个月

      // 计算User1的奖励 (1年)
      const user1Rewards = calculateExpectedRewards(stakeAmount1, BigInt(YEAR_IN_SECONDS), INITIAL_REWARD_RATE);
      // 计算User2的奖励 (6个月)
      const user2Rewards = calculateExpectedRewards(stakeAmount2, BigInt(halfYear), INITIAL_REWARD_RATE);

      expect(await stakingContract.getRewards(user1.address)).to.be.closeTo(user1Rewards, user1Rewards / 1000n);
      expect(await stakingContract.getRewards(user2.address)).to.be.closeTo(user2Rewards, user2Rewards / 1000n);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to set reward rate", async function () {
      const { stakingContract, owner } = await loadFixture(deployStakingContractFixture);
      const newRate = 15; // 15%

      await expect(stakingContract.connect(owner).setRewardRate(newRate))
        .to.emit(stakingContract, "RewardRateUpdated")
        .withArgs(newRate);

      expect(await stakingContract.rewardRate()).to.equal(newRate);
    });

    it("Should not allow non-owner to set reward rate", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const newRate = 15;

      await expect(stakingContract.connect(user1).setRewardRate(newRate))
        .to.be.revertedWithCustomError(stakingContract, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("Should not allow reward rate exceeding maximum", async function () {
      const { stakingContract, owner } = await loadFixture(deployStakingContractFixture);
      const excessiveRate = 51; // 超过50%

      await expect(stakingContract.connect(owner).setRewardRate(excessiveRate)).to.be.revertedWith(
        "Reward rate cannot exceed 50%"
      );
    });

    it("Should allow owner to pause and unpause contract", async function () {
      const { stakingContract, owner, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");

      // 暂停合约
      await expect(stakingContract.connect(owner).pause())
        .to.emit(stakingContract, "ContractPaused")
        .withArgs(true);

      // 尝试在暂停状态下质押
      await expect(stakingContract.connect(user1).stake({ value: stakeAmount }))
        .to.be.revertedWithCustomError(stakingContract, "EnforcedPause");

      // 恢复合约
      await expect(stakingContract.connect(owner).unpause())
        .to.emit(stakingContract, "ContractPaused")
        .withArgs(false);

      // 现在应该可以质押
      await stakingContract.connect(user1).stake({ value: stakeAmount });
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small staking durations", async function () {
      const { stakingContract, user1, owner } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");
      const veryShortDuration = 60 * 60; // 1小时

      // 所有者存入奖励资金
      await stakingContract.connect(owner).depositRewards({ value: ethers.parseEther("1") });

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(veryShortDuration);

      const expectedRewards = calculateExpectedRewards(stakeAmount, BigInt(veryShortDuration), INITIAL_REWARD_RATE);
      const actualRewards = await stakingContract.getRewards(user1.address);

      // 考虑到舍入误差，使用近似比较
      expect(actualRewards).to.be.closeTo(expectedRewards, expectedRewards / 1000n);
    });

    it("Should handle zero rewards correctly", async function () {
      const { stakingContract, user1 } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      // 不增加时间，直接检查奖励
      const rewards = await stakingContract.getRewards(user1.address);
      expect(rewards).to.equal(0);
    });

    it("Should handle reward rate updates", async function () {
      const { stakingContract, user1, owner } = await loadFixture(deployStakingContractFixture);
      const stakeAmount = ethers.parseEther("1");
      const firstPeriod = YEAR_IN_SECONDS / 4; // 3个月
      const secondPeriod = YEAR_IN_SECONDS / 4; // 3个月
      const newRate = 24; // 24%

      // 所有者存入奖励资金
      await stakingContract.connect(owner).depositRewards({ value: ethers.parseEther("1") });

      await stakingContract.connect(user1).stake({ value: stakeAmount });
      await time.increase(firstPeriod);

      // 更新奖励率
      await stakingContract.connect(owner).setRewardRate(newRate);
      await time.increase(secondPeriod);

      // 计算两个阶段的奖励
      const firstPeriodRewards = calculateExpectedRewards(stakeAmount, BigInt(firstPeriod), INITIAL_REWARD_RATE);
      const secondPeriodRewards = calculateExpectedRewards(stakeAmount, BigInt(secondPeriod), newRate);
      const totalExpectedRewards = firstPeriodRewards + secondPeriodRewards;

      const actualRewards = await stakingContract.getRewards(user1.address);
      expect(actualRewards).to.be.closeTo(totalExpectedRewards, totalExpectedRewards / 1000n);
    });
  });
});