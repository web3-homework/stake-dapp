"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wallet, Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 合约ABI (简化版)
const STAKING_ABI = [
  "function stake() external payable",
  "function unstake(uint256 amount) external",
  "function getStakedAmount(address user) external view returns (uint256)",
  "function getRewards(address user) external view returns (uint256)",
  "function claimRewards() external",
  "function totalStaked() external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event RewardsClaimed(address indexed user, uint256 amount)",
]

// 合约地址 (示例地址)
const STAKING_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"

export default function StakingDApp() {
  const [account, setAccount] = useState<string>("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [balance, setBalance] = useState<string>("0")
  const [stakedAmount, setStakedAmount] = useState<string>("0")
  const [rewards, setRewards] = useState<string>("0")
  const [totalStaked, setTotalStaked] = useState<string>("0")
  const [stakeAmount, setStakeAmount] = useState<string>("")
  const [unstakeAmount, setUnstakeAmount] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const { toast } = useToast()

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer)

        setProvider(provider)
        setAccount(accounts[0])
        setContract(contract)

        await updateBalances(accounts[0], provider, contract)

        toast({
          title: "钱包连接成功",
          description: `地址: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        })
      } else {
        toast({
          title: "错误",
          description: "请安装MetaMask钱包",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("连接钱包失败:", error)
      toast({
        title: "连接失败",
        description: "无法连接到钱包",
        variant: "destructive",
      })
    }
  }

  // 断开连接
  const disconnectWallet = () => {
    setAccount("")
    setProvider(null)
    setContract(null)
    setBalance("0")
    setStakedAmount("0")
    setRewards("0")
    setTotalStaked("0")
    toast({
      title: "钱包已断开",
      description: "已成功断开钱包连接",
    })
  }

  // 更新余额信息
  const updateBalances = async (userAccount: string, provider: ethers.BrowserProvider, contract: ethers.Contract) => {
    try {
      const balance = await provider.getBalance(userAccount)
      const staked = await contract.getStakedAmount(userAccount)
      const rewards = await contract.getRewards(userAccount)
      const total = await contract.totalStaked()

      setBalance(ethers.formatEther(balance))
      setStakedAmount(ethers.formatEther(staked))
      setRewards(ethers.formatEther(rewards))
      setTotalStaked(ethers.formatEther(total))
    } catch (error) {
      console.error("更新余额失败:", error)
    }
  }

  // 质押
  const handleStake = async () => {
    if (!contract || !stakeAmount) return

    setLoading(true)
    try {
      const tx = await contract.stake({
        value: ethers.parseEther(stakeAmount),
      })
      await tx.wait()

      await updateBalances(account, provider!, contract)
      setStakeAmount("")

      toast({
        title: "质押成功",
        description: `已质押 ${stakeAmount} ETH`,
      })
    } catch (error) {
      console.error("质押失败:", error)
      toast({
        title: "质押失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  // 解质押
  const handleUnstake = async () => {
    if (!contract || !unstakeAmount) return

    setLoading(true)
    try {
      const tx = await contract.unstake(ethers.parseEther(unstakeAmount))
      await tx.wait()

      await updateBalances(account, provider!, contract)
      setUnstakeAmount("")

      toast({
        title: "解质押成功",
        description: `已解质押 ${unstakeAmount} ETH`,
      })
    } catch (error) {
      console.error("解质押失败:", error)
      toast({
        title: "解质押失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  // 领取奖励
  const handleClaimRewards = async () => {
    if (!contract) return

    setLoading(true)
    try {
      const tx = await contract.claimRewards()
      await tx.wait()

      await updateBalances(account, provider!, contract)

      toast({
        title: "奖励领取成功",
        description: `已领取 ${rewards} ETH 奖励`,
      })
    } catch (error) {
      console.error("领取奖励失败:", error)
      toast({
        title: "领取失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  // 监听账户变化
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          setAccount(accounts[0])
          if (provider && contract) {
            updateBalances(accounts[0], provider, contract)
          }
        }
      })
    }
  }, [provider, contract])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">质押 DApp</h1>
          </div>

          {!account ? (
            <Button onClick={connectWallet} className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              连接钱包
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                {account.slice(0, 6)}...{account.slice(-4)}
              </Badge>
              <Button variant="outline" onClick={disconnectWallet}>
                断开连接
              </Button>
            </div>
          )}
        </div>

        {account ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 账户信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  账户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">钱包余额</Label>
                  <p className="text-2xl font-bold">{Number.parseFloat(balance).toFixed(4)} ETH</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">已质押金额</Label>
                  <p className="text-2xl font-bold text-blue-600">{Number.parseFloat(stakedAmount).toFixed(4)} ETH</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">待领取奖励</Label>
                  <p className="text-2xl font-bold text-green-600">{Number.parseFloat(rewards).toFixed(6)} ETH</p>
                </div>
              </CardContent>
            </Card>

            {/* 质押操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5" />
                  质押操作
                </CardTitle>
                <CardDescription>质押ETH获得奖励</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stake-amount">质押金额 (ETH)</Label>
                  <Input
                    id="stake-amount"
                    type="number"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                </div>
                <Button onClick={handleStake} disabled={!stakeAmount || loading} className="w-full">
                  {loading ? "处理中..." : "质押"}
                </Button>

                <Separator />

                <div>
                  <Label htmlFor="unstake-amount">解质押金额 (ETH)</Label>
                  <Input
                    id="unstake-amount"
                    type="number"
                    placeholder="0.0"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleUnstake}
                  disabled={!unstakeAmount || loading}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  {loading ? "处理中..." : "解质押"}
                </Button>
              </CardContent>
            </Card>

            {/* 奖励信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  奖励信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">总质押量</Label>
                  <p className="text-2xl font-bold">{Number.parseFloat(totalStaked).toFixed(2)} ETH</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">年化收益率</Label>
                  <p className="text-2xl font-bold text-green-600">12%</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">我的奖励</Label>
                  <p className="text-xl font-bold text-green-600">{Number.parseFloat(rewards).toFixed(6)} ETH</p>
                </div>
                <Button
                  onClick={handleClaimRewards}
                  disabled={Number.parseFloat(rewards) === 0 || loading}
                  className="w-full"
                  variant="secondary"
                >
                  {loading ? "处理中..." : "领取奖励"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">连接您的钱包</h2>
              <p className="text-gray-600 mb-6">请连接您的Web3钱包以开始使用质押功能</p>
              <Button onClick={connectWallet} size="lg">
                连接钱包
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
