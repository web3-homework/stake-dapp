"use client"

import { useState, useEffect } from "react"
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEther, formatEther } from "viem"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ConnectButton } from '@rainbow-me/rainbowkit';

// 合约ABI
const STAKING_ABI = [
  {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bool",
          "name": "paused",
          "type": "bool"
        }
      ],
      "name": "ContractPaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newRate",
          "type": "uint256"
        }
      ],
      "name": "RewardRateUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RewardsClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RewardsDeposited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Staked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Unstaked",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "PRECISION",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "SECONDS_PER_YEAR",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "calculateRewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "claimRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "depositRewards",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "emergencyWithdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getRewards",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getStakedAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lastUpdateTime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "rewardPerTokenStored",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "rewardRate",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newRate",
          "type": "uint256"
        }
      ],
      "name": "setRewardRate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "stake",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "stakes",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lastRewardTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "rewardDebt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalStaked",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "unstake",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
] as const

// 合约地址 (需要替换为实际部署的合约地址)
const STAKING_CONTRACT_ADDRESS = "0x9Eb23b1115E5E16Ec679Bea6Cf2444d89a6f0647" as `0x${string}`

export default function StakingDApp() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  const [stakeAmount, setStakeAmount] = useState<string>("0.0")
  const [unstakeAmount, setUnstakeAmount] = useState<string>("0.0")

  // 获取ETH余额
  const { data: balance } = useBalance({
    address: address,
  })

  // 读取合约数据
  const { data: stakedAmount, refetch: refetchStakedAmount } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "getStakedAmount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: rewards, refetch: refetchRewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "getRewards",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "getContractBalance",
  })

  const { data: rewardRate } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "rewardRate",
  })

  // 写入合约
  const { data: stakeHash, writeContract: writeStake, isPending: isStakePending } = useWriteContract()

  const { data: unstakeHash, writeContract: writeUnstake, isPending: isUnstakePending } = useWriteContract()

  const { data: claimHash, writeContract: writeClaim, isPending: isClaimPending } = useWriteContract()

  // 等待交易确认
  const { isLoading: isStakeLoading, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeHash,
  })

  const { isLoading: isUnstakeLoading, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  })

  const { isLoading: isClaimLoading, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // 刷新数据
  const refreshData = () => {
    refetchStakedAmount()
    refetchRewards()
    refetchTotalStaked()
  }

  // 监听交易成功
  useEffect(() => {
    if (isStakeSuccess) {
      toast({
        title: "质押成功",
        description: `已质押 ${stakeAmount} ETH`,
      })
      setStakeAmount("")
      refreshData()
    }
  }, [isStakeSuccess, stakeAmount, toast])

  useEffect(() => {
    if (isUnstakeSuccess) {
      toast({
        title: "解质押成功",
        description: `已解质押 ${unstakeAmount} ETH`,
      })
      setUnstakeAmount("")
      refreshData()
    }
  }, [isUnstakeSuccess, unstakeAmount, toast])

  useEffect(() => {
    if (isClaimSuccess) {
      toast({
        title: "奖励领取成功",
        description: `已领取 ${rewards ? formatEther(rewards) : "0"} ETH 奖励`,
      })
      refreshData()
    }
  }, [isClaimSuccess, rewards, toast])

  // 质押函数
  const handleStake = async () => {
    if (!stakeAmount || !address) return

    try {
      writeStake({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: "stake",
        value: parseEther(stakeAmount),
      })
    } catch (error) {
      console.error("质押失败:", error)
      toast({
        title: "质押失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
  }

  // 解质押函数
  const handleUnstake = async () => {
    if (!unstakeAmount || !address) return

    try {
      writeUnstake({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: "unstake",
        args: [parseEther(unstakeAmount)],
      })
    } catch (error) {
      console.error("解质押失败:", error)
      toast({
        title: "解质押失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
  }

  // 领取奖励函数
  const handleClaimRewards = async () => {
    if (!address) return

    try {
      writeClaim({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: "claimRewards",
      })
    } catch (error) {
      console.error("领取奖励失败:", error)
      toast({
        title: "领取失败",
        description: "交易执行失败",
        variant: "destructive",
      })
    }
  }

  const isLoading =
    isStakePending || isStakeLoading || isUnstakePending || isUnstakeLoading || isClaimPending || isClaimLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">质押 DApp</h1>
          </div>

          <ConnectButton />
        </div>

        {isConnected ? (
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
                  <p className="text-2xl font-bold">
                    {balance ? Number.parseFloat(formatEther(balance.value)).toFixed(4) : "0.0000"} ETH
                  </p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">已质押金额</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {stakedAmount ? Number.parseFloat(formatEther(stakedAmount)).toFixed(4) : "0.0000"} ETH
                  </p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">待领取奖励</Label>
                  <p className="text-2xl font-bold text-green-600">
                    {rewards ? Number.parseFloat(formatEther(rewards)).toFixed(6) : "0.000000"} ETH
                  </p>
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
                    placeholder="0"
                    min={0}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button onClick={handleStake} disabled={!Number(stakeAmount) || isLoading} className="w-full">
                  {isStakePending || isStakeLoading ? "处理中..." : "质押"}
                </Button>

                <Separator />

                <div>
                  <Label htmlFor="unstake-amount">解质押金额 (ETH)</Label>
                  <Input
                    id="unstake-amount"
                    type="number"
                    placeholder="0"
                    min={0}
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleUnstake}
                  disabled={!Number(unstakeAmount) || isLoading}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  {isUnstakePending || isUnstakeLoading ? "处理中..." : "解质押"}
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
                  <p className="text-2xl font-bold">
                    {totalStaked ? Number.parseFloat(formatEther(totalStaked)).toFixed(2) : "0.00"} ETH
                  </p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">年化收益率</Label>
                  <p className="text-2xl font-bold text-green-600">{rewardRate ? `${rewardRate}%` : "12%"}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">我的奖励</Label>
                  <p className="text-xl font-bold text-green-600">
                    {rewards ? rewards.toString() : "0"} wei
                  </p>
                </div>
                <Button
                  onClick={handleClaimRewards}
                  disabled={!rewards || rewards === BigInt(0) || isLoading}
                  className="w-full"
                  variant="secondary"
                >
                  {isClaimPending || isClaimLoading ? "处理中..." : "领取奖励"}
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
              {/* 在未连接状态的卡片中也替换 */}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
