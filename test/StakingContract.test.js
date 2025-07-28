const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("StakingContract", () => {
  let stakingContract
  let owner
  let user1
  let user2

  beforeEach(async () => {
    ;[owner, user1, user2] = await ethers.getSigners()

    const StakingContract = await ethers.getContractFactory("StakingContract")
    stakingContract = await StakingContract.deploy()
    await stakingContract.deployed()

    // 向合约存入一些ETH用于支付奖励
    await stakingContract.depositRewards({ value: ethers.utils.parseEther("10") })
  })

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await stakingContract.owner()).to.equal(owner.address)
    })

    it("Should have correct initial values", async () => {
      expect(await stakingContract.totalStaked()).to.equal(0)
      expect(await stakingContract.rewardRate()).to.equal(12)
    })
  })

  describe("Staking", () => {
    it("Should allow users to stake ETH", async () => {
      const stakeAmount = ethers.utils.parseEther("1")

      await expect(stakingContract.connect(user1).stake({ value: stakeAmount }))
        .to.emit(stakingContract, "Staked")
        .withArgs(user1.address, stakeAmount)

      expect(await stakingContract.getStakedAmount(user1.address)).to.equal(stakeAmount)
      expect(await stakingContract.totalStaked()).to.equal(stakeAmount)
    })

    it("Should reject zero stake amount", async () => {
      await expect(stakingContract.connect(user1).stake({ value: 0 })).to.be.revertedWith(
        "Stake amount must be greater than 0",
      )
    })

    it("Should allow multiple stakes from same user", async () => {
      const stakeAmount1 = ethers.utils.parseEther("1")
      const stakeAmount2 = ethers.utils.parseEther("0.5")

      await stakingContract.connect(user1).stake({ value: stakeAmount1 })
      await stakingContract.connect(user1).stake({ value: stakeAmount2 })

      expect(await stakingContract.getStakedAmount(user1.address)).to.equal(stakeAmount1.add(stakeAmount2))
    })
  })

  describe("Unstaking", () => {
    beforeEach(async () => {
      await stakingContract.connect(user1).stake({ value: ethers.utils.parseEther("2") })
    })

    it("Should allow users to unstake", async () => {
      const unstakeAmount = ethers.utils.parseEther("1")
      const initialBalance = await user1.getBalance()

      const tx = await stakingContract.connect(user1).unstake(unstakeAmount)
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)

      expect(await stakingContract.getStakedAmount(user1.address)).to.equal(ethers.utils.parseEther("1"))

      // 检查用户余额增加（减去gas费用）
      const finalBalance = await user1.getBalance()
      expect(finalBalance.add(gasUsed).sub(initialBalance)).to.equal(unstakeAmount)
    })

    it("Should reject unstaking more than staked", async () => {
      const unstakeAmount = ethers.utils.parseEther("3")

      await expect(stakingContract.connect(user1).unstake(unstakeAmount)).to.be.revertedWith(
        "Insufficient staked amount",
      )
    })

    it("Should reject zero unstake amount", async () => {
      await expect(stakingContract.connect(user1).unstake(0)).to.be.revertedWith(
        "Unstake amount must be greater than 0",
      )
    })
  })

  describe("Rewards", () => {
    beforeEach(async () => {
      await stakingContract.connect(user1).stake({ value: ethers.utils.parseEther("1") })
    })

    it("Should calculate rewards correctly", async () => {
      // 增加时间来累积奖励
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]) // 1年
      await ethers.provider.send("evm_mine")

      const rewards = await stakingContract.getRewards(user1.address)
      const expectedRewards = ethers.utils.parseEther("0.12") // 12% of 1 ETH

      // 允许小的精度误差
      expect(rewards).to.be.closeTo(expectedRewards, ethers.utils.parseEther("0.001"))
    })

    it("Should allow users to claim rewards", async () => {
      // 增加时间来累积奖励
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]) // 30天
      await ethers.provider.send("evm_mine")

      const initialBalance = await user1.getBalance()
      const rewards = await stakingContract.getRewards(user1.address)

      if (rewards.gt(0)) {
        const tx = await stakingContract.connect(user1).claimRewards()
        const receipt = await tx.wait()
        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)

        const finalBalance = await user1.getBalance()
        expect(finalBalance.add(gasUsed).sub(initialBalance)).to.equal(rewards)

        // 奖励应该重置
        expect(await stakingContract.getRewards(user1.address)).to.equal(0)
      }
    })

    it("Should reject claiming zero rewards", async () => {
      // 没有等待时间，奖励应该为0
      await expect(stakingContract.connect(user1).claimRewards()).to.be.revertedWith("No rewards available")
    })
  })

  describe("Owner functions", () => {
    it("Should allow owner to set reward rate", async () => {
      const newRate = 15

      await expect(stakingContract.setRewardRate(newRate))
        .to.emit(stakingContract, "RewardRateUpdated")
        .withArgs(newRate)

      expect(await stakingContract.rewardRate()).to.equal(newRate)
    })

    it("Should reject reward rate over 100%", async () => {
      await expect(stakingContract.setRewardRate(101)).to.be.revertedWith("Reward rate cannot exceed 100%")
    })

    it("Should reject non-owner setting reward rate", async () => {
      await expect(stakingContract.connect(user1).setRewardRate(15)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      )
    })

    it("Should allow owner to deposit rewards", async () => {
      const depositAmount = ethers.utils.parseEther("5")
      const initialBalance = await ethers.provider.getBalance(stakingContract.address)

      await stakingContract.depositRewards({ value: depositAmount })

      const finalBalance = await ethers.provider.getBalance(stakingContract.address)
      expect(finalBalance.sub(initialBalance)).to.equal(depositAmount)
    })

    it("Should allow owner emergency withdraw", async () => {
      const withdrawAmount = ethers.utils.parseEther("1")
      const initialOwnerBalance = await owner.getBalance()

      const tx = await stakingContract.emergencyWithdraw(withdrawAmount)
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)

      const finalOwnerBalance = await owner.getBalance()
      expect(finalOwnerBalance.add(gasUsed).sub(initialOwnerBalance)).to.equal(withdrawAmount)
    })
  })

  describe("Edge cases", () => {
    it("Should handle multiple users staking", async () => {
      await stakingContract.connect(user1).stake({ value: ethers.utils.parseEther("1") })
      await stakingContract.connect(user2).stake({ value: ethers.utils.parseEther("2") })

      expect(await stakingContract.totalStaked()).to.equal(ethers.utils.parseEther("3"))
      expect(await stakingContract.getStakedAmount(user1.address)).to.equal(ethers.utils.parseEther("1"))
      expect(await stakingContract.getStakedAmount(user2.address)).to.equal(ethers.utils.parseEther("2"))
    })

    it("Should handle complete unstaking", async () => {
      const stakeAmount = ethers.utils.parseEther("1")
      await stakingContract.connect(user1).stake({ value: stakeAmount })

      await stakingContract.connect(user1).unstake(stakeAmount)

      expect(await stakingContract.getStakedAmount(user1.address)).to.equal(0)
      expect(await stakingContract.totalStaked()).to.equal(0)
    })
  })
})
