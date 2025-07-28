const { ethers } = require("hardhat")

async function main() {
  console.log("开始部署质押合约...")

  // 获取部署账户
  const [deployer] = await ethers.getSigners()
  console.log("部署账户:", deployer.address)
  console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "ETH")

  // 部署合约
  const StakingContract = await ethers.getContractFactory("StakingContract")
  const stakingContract = await StakingContract.deploy()
  await stakingContract.deployed()

  console.log("质押合约已部署到:", stakingContract.address)

  // 向合约存入一些ETH用于支付奖励
  const depositAmount = ethers.utils.parseEther("10")
  console.log("向合约存入奖励资金:", ethers.utils.formatEther(depositAmount), "ETH")

  const depositTx = await stakingContract.depositRewards({ value: depositAmount })
  await depositTx.wait()

  console.log("部署完成!")
  console.log("合约地址:", stakingContract.address)
  console.log("合约余额:", ethers.utils.formatEther(await ethers.provider.getBalance(stakingContract.address)), "ETH")

  // 验证合约（如果在测试网或主网）
  const network = await ethers.provider.getNetwork()
  const hre = require("hardhat")
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("等待区块确认...")
    await stakingContract.deployTransaction.wait(6)

    console.log("验证合约...")
    try {
      await hre.run("verify:verify", {
        address: stakingContract.address,
        constructorArguments: [],
      })
    } catch (error) {
      console.log("验证失败:", error.message)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
