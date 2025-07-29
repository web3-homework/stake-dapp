const { ethers } = require("hardhat")

async function main() {
  console.log("开始部署质押合约...")

  // 获取部署账户
  const [deployer] = await ethers.getSigners()
  const provider = ethers.provider;

  // 获取部署者地址
  const deployerAddress = deployer.address;

  // 通过 provider 获取余额
  const balanceWei = await provider.getBalance(deployerAddress);

  console.log("部署账户地址:", deployer._accounts[0]);
  console.log("部署账户:", deployer.address)
  console.log("账户余额:", ethers.formatEther(balanceWei), "ETH")

  // 部署合约
  const StakingContract = await ethers.getContractFactory("StakingContract")
  const stakingContract = await StakingContract.deploy()
  await stakingContract.waitForDeployment() 

  console.log("质押合约已部署到:", await stakingContract.getAddress()) 

  // 向合约存入一些ETH用于支付奖励
  // const depositAmount = ethers.parseEther("0.03")
  // console.log("向合约存入奖励资金:", ethers.formatEther(depositAmount), "ETH")

  // const depositTx = await stakingContract.depositRewards({ value: depositAmount })
  // await depositTx.wait()

  console.log("部署完成!")
  console.log("合约地址:", await stakingContract.getAddress()) 
  console.log("合约余额:", ethers.formatEther(await ethers.provider.getBalance(await stakingContract.getAddress())), "ETH")

  // 验证合约（如果在测试网或主网）
  const network = await ethers.provider.getNetwork()
  const hre = require("hardhat")
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("等待区块确认...")
    const deploymentTx = stakingContract.deploymentTransaction();
    await deploymentTx.wait(6); // 等待6个区块确认

    console.log("验证合约...")
    try {
      await hre.run("verify:verify", {
        address: await stakingContract.getAddress(), // 修正：使用 getAddress()
        constructorArguments: [], // 如果有构造函数参数，需要在这里传入
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