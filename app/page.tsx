"use client";

import { useState, useEffect } from "react";
import {
	useAccount,
	useBalance,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle, Wallet, Settings, DollarSign, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// ========================
// 合约 ABI（精简清晰）
// ========================
const STAKING_ABI = [
	{
		inputs: [],
		stateMutability: "nonpayable",
		type: "constructor",
	},
	{
		inputs: [],
		name: "EnforcedPause",
		type: "error",
	},
	{
		inputs: [],
		name: "ExpectedPause",
		type: "error",
	},
	{
		inputs: [{ internalType: "address", name: "owner", type: "address" }],
		name: "OwnableInvalidOwner",
		type: "error",
	},
	{
		inputs: [{ internalType: "address", name: "account", type: "address" }],
		name: "OwnableUnauthorizedAccount",
		type: "error",
	},
	{
		inputs: [],
		name: "ReentrancyGuardReentrantCall",
		type: "error",
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: "bool", name: "paused", type: "bool" }],
		name: "ContractPaused",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
		{ indexed: true, internalType: "address", name: "previousOwner", type: "address" },
		{ indexed: true, internalType: "address", name: "newOwner", type: "address" },
		],
		name: "OwnershipTransferred",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }],
		name: "Paused",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: "uint256", name: "newRate", type: "uint256" }],
		name: "RewardRateUpdated",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
		{ indexed: true, internalType: "address", name: "user", type: "address" },
		{ indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
		],
		name: "RewardsClaimed",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: "uint256", name: "amount", type: "uint256" }],
		name: "RewardsDeposited",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
		{ indexed: true, internalType: "address", name: "user", type: "address" },
		{ indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
		],
		name: "Staked",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }],
		name: "Unpaused",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
		{ indexed: true, internalType: "address", name: "user", type: "address" },
		{ indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
		],
		name: "Unstaked",
		type: "event",
	},
	{
		inputs: [],
		name: "PRECISION",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "SECONDS_PER_YEAR",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "user", type: "address" }],
		name: "calculateRewards",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "claimRewards",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "depositRewards",
		outputs: [],
		stateMutability: "payable",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
		name: "emergencyWithdraw",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "getContractBalance",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "user", type: "address" }],
		name: "getRewards",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "user", type: "address" }],
		name: "getStakedAmount",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "lastUpdateTime",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "owner",
		outputs: [{ internalType: "address", name: "", type: "address" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "pause",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "paused",
		outputs: [{ internalType: "bool", name: "", type: "bool" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "renounceOwnership",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "rewardPerTokenStored",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "rewardRate",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "newRate", type: "uint256" }],
		name: "setRewardRate",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "stake",
		outputs: [],
		stateMutability: "payable",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "", type: "address" }],
		name: "stakes",
		outputs: [
		{ internalType: "uint256", name: "amount", type: "uint256" },
		{ internalType: "uint256", name: "timestamp", type: "uint256" },
		{ internalType: "uint256", name: "lastRewardTime", type: "uint256" },
		{ internalType: "uint256", name: "rewardDebt", type: "uint256" },
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "totalStaked",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
		name: "transferOwnership",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [],
		name: "unpause",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
		name: "unstake",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		stateMutability: "payable",
		type: "receive",
	},
] as const;

// ========================
// 合约地址（请替换为你的实际地址）
// ========================
const STAKING_CONTRACT_ADDRESS = "0xa5F7abA4C00a957Cf7b45246E526b3799a2CA729" as `0x${string}`;

// ========================
// 格式化工具函数
// ========================
const formatNumber = (num: number, decimals: number = 4) =>
	Number(num.toFixed(decimals)).toLocaleString(undefined, {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});

// ========================
// 主组件
// ========================
export default function StakingDApp() {
	const { address, isConnected } = useAccount();
	const { toast } = useToast();

	const [stakeAmount, setStakeAmount] = useState<string>("");
	const [unstakeAmount, setUnstakeAmount] = useState<string>("");
	const [newRewardRate, setNewRewardRate] = useState<string>(""); // 管理员输入
	const [depositAmount, setDepositAmount] = useState<string>(""); // 存入奖励金
	const [withdrawAmount, setWithdrawAmount] = useState<string>(""); // 紧急提取

	// 读取用户余额
	const {
	  data: balance,
	  refetch: refetchBalance // 添加refetch函数
	} = useBalance({ address });

	// 读取合约数据
	const {
		data: stakedAmount,
		refetch: refetchStakedAmount,
		isFetching: isFetchingStaked,
	} = useReadContract({
		address: STAKING_CONTRACT_ADDRESS,
		abi: STAKING_ABI,
		functionName: "getStakedAmount",
		args: [address!],
		query: { enabled: !!address },
	});

	const {
		data: rewards,
		refetch: refetchRewards,
		isFetching: isFetchingRewards,
	} = useReadContract({
		address: STAKING_CONTRACT_ADDRESS,
		abi: STAKING_ABI,
		functionName: "getRewards",
		args: [address!],
		query: { enabled: !!address },
	});

	const {
		data: totalStaked,
		refetch: refetchTotalStaked,
		isFetching: isFetchingTotal,
	} = useReadContract({
		address: STAKING_CONTRACT_ADDRESS,
		abi: STAKING_ABI,
		functionName: "getContractBalance",
	});

	const { data: rewardRate } = useReadContract({
		address: STAKING_CONTRACT_ADDRESS,
		abi: STAKING_ABI,
		functionName: "rewardRate",
	});

	const { data: contractOwner } = useReadContract({
		address: STAKING_CONTRACT_ADDRESS,
		abi: STAKING_ABI,
		functionName: "owner",
	});

	// 是否是管理员
	const isAdmin = isConnected && address && contractOwner === address;

	// 写入操作
	const { data: stakeHash, writeContract: writeStake, isPending: isStakePending } = useWriteContract();
	const { data: unstakeHash, writeContract: writeUnstake, isPending: isUnstakePending } = useWriteContract();
	const { data: claimHash, writeContract: writeClaim, isPending: isClaimPending } = useWriteContract();

	// 👇 新增：管理员操作的写入函数
	const { data: rateHash, writeContract: writeSetRate, isPending: isRatePending } = useWriteContract();
	const { data: depositHash, writeContract: writeDeposit, isPending: isDepositPending } = useWriteContract();
	const { data: withdrawHash, writeContract: writeWithdraw, isPending: isWithdrawPending } = useWriteContract();

	// 👇 新增：交易监听
	const { isLoading: isStakeLoading, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
		hash: stakeHash,
	});
	const { isLoading: isUnstakeLoading, isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({
		hash: unstakeHash,
	});
	const { isLoading: isClaimLoading, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
		hash: claimHash,
	});
	const { isLoading: isRateLoading, isSuccess: isRateSuccess } = useWaitForTransactionReceipt({
		hash: rateHash,
	});
	const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
		hash: depositHash,
	});
	const { isLoading: isWithdrawLoading, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
		hash: withdrawHash,
	});

	// 刷新所有数据
	const refreshData = () => {
		refetchStakedAmount();
		refetchRewards();
		refetchTotalStaked();
		refetchBalance(); // 添加余额刷新
	};

	// 👇 新增：定时刷新数据，实现奖励实时变动
	useEffect(() => {
		// 只有在用户连接钱包后才启动定时刷新
		if (!isConnected) return;

		// 设置定时器，每60秒刷新一次数据
		const refreshInterval = setInterval(() => {
			refreshData();
		}, 60000);

		// 清理函数：组件卸载或用户断开连接时清除定时器
		return () => {
			clearInterval(refreshInterval);
		};
	}, [isConnected, refreshData]);

	// 交易成功通知
	useEffect(() => {
		if (isStakeSuccess) {
		toast({
			title: "✅ 质押成功",
			description: `已成功质押 ${stakeAmount} ETH`,
		});
		setStakeAmount("");
		refreshData();
		}
	}, [isStakeSuccess, stakeAmount, toast]);

	useEffect(() => {
		if (isUnstakeSuccess) {
		toast({
			title: "✅ 解质押成功",
			description: `已成功解质押 ${unstakeAmount} ETH`,
		});
		setUnstakeAmount("");
		refreshData();
		}
	}, [isUnstakeSuccess, unstakeAmount, toast]);

	useEffect(() => {
		if (isClaimSuccess) {
		toast({
			title: "✅ 奖励领取成功",
			description: `已成功领取奖励`,
		});
		refreshData();
		}
	}, [isClaimSuccess, toast]);

	// 👇 新增：管理员操作成功通知
	useEffect(() => {
		if (isRateSuccess) {
		toast({
			title: "✅ 奖励率更新成功",
			description: `新的年化收益率为 ${newRewardRate}%`,
		});
		setNewRewardRate("");
		refreshData();
		}
	}, [isRateSuccess, newRewardRate, toast]);

	useEffect(() => {
		if (isDepositSuccess) {
		toast({
			title: "✅ 奖励金存入成功",
			description: `已存入 ${depositAmount} ETH 作为奖励资金`,
		});
		setDepositAmount("");
		refreshData();
		}
	}, [isDepositSuccess, depositAmount, toast]);

	useEffect(() => {
		if (isWithdrawSuccess) {
		toast({
			title: "✅ 紧急提取成功",
			description: `已提取 ${withdrawAmount} ETH`,
		});
		setWithdrawAmount("");
		refreshData();
		}
	}, [isWithdrawSuccess, withdrawAmount, toast]);

	// 处理质押
	const handleStake = async () => {
		if (!stakeAmount || !address || parseFloat(stakeAmount) <= 0) return;

		const amount = parseEther(stakeAmount);
		const userBalance = balance?.value || 0;

		if (amount > userBalance) {
		toast({
			title: "❌ 余额不足",
			description: "您的ETH余额不足以完成此次质押。",
			variant: "destructive",
		});
		return;
		}

		try {
		writeStake({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "stake",
			value: amount,
		});
		} catch (error: any) {
		console.error("质押失败:", error);
		toast({
			title: "❌ 质押失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	// 处理解质押
	const handleUnstake = async () => {
		if (!unstakeAmount || !address || parseFloat(unstakeAmount) <= 0) return;

		const amount = parseEther(unstakeAmount);
		if (stakedAmount === undefined || amount > (stakedAmount as bigint)) {
		toast({
			title: "❌ 解质押失败",
			description: "解质押金额超过您当前质押的ETH数量。",
			variant: "destructive",
		});
		return;
		}

		try {
		writeUnstake({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "unstake",
			args: [amount],
		});
		} catch (error: any) {
		console.error("解质押失败:", error);
		toast({
			title: "❌ 解质押失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	// 领取奖励
	const handleClaimRewards = async () => {
		if (!rewards) return;

		try {
		writeClaim({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "claimRewards",
		});
		} catch (error: any) {
		console.error("领取奖励失败:", error);
		toast({
			title: "❌ 领取失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	// 全局加载状态
	const isLoading =
		isStakePending ||
		isStakeLoading ||
		isUnstakePending ||
		isUnstakeLoading ||
		isClaimPending ||
		isClaimLoading ||
		isRatePending ||
		isRateLoading ||
		isDepositPending ||
		isDepositLoading ||
		isWithdrawPending ||
		isWithdrawLoading ||
		isFetchingStaked ||
		isFetchingRewards ||
		isFetchingTotal;

	const handleSetRewardRate = async () => {
		if (!newRewardRate || !isAdmin) return;
		const rate = parseInt(newRewardRate);
		if (rate <= 0 || rate > 50) {
		toast({
			title: "❌ 无效的奖励率",
			description: "奖励率应在 1 到 50 之间。",
			variant: "destructive",
		});
		return;
		}

		try {
		writeSetRate({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "setRewardRate",
			args: [BigInt(rate)],
		});
		} catch (error: any) {
		console.error("设置奖励率失败:", error);
		toast({
			title: "❌ 操作失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	const handleDepositRewards = async () => {
		if (!depositAmount || !isAdmin) return;
		const amount = parseFloat(depositAmount);
		if (amount <= 0) {
		toast({
			title: "❌ 金额无效",
			description: "请输入大于0的金额。",
			variant: "destructive",
		});
		return;
		}

		const value = parseEther(depositAmount);
		const userBalance = balance?.value || 0;
		if (value > userBalance) {
		toast({
			title: "❌ 余额不足",
			description: "您的ETH余额不足以存入该金额。",
			variant: "destructive",
		});
		return;
		}

		try {
		writeDeposit({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "depositRewards",
			value,
		});
		} catch (error: any) {
		console.error("存入奖励金失败:", error);
		toast({
			title: "❌ 操作失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	const handleEmergencyWithdraw = async () => {
		if (!withdrawAmount || !isAdmin) return;
		const amount = parseFloat(withdrawAmount);
		if (amount <= 0) {
		toast({
			title: "❌ 金额无效",
			description: "请输入大于0的金额。",
			variant: "destructive",
		});
		return;
		}

		try {
		writeWithdraw({
			address: STAKING_CONTRACT_ADDRESS,
			abi: STAKING_ABI,
			functionName: "emergencyWithdraw",
			args: [parseEther(withdrawAmount)],
		});
		} catch (error: any) {
		console.error("紧急提取失败:", error);
		toast({
			title: "❌ 操作失败",
			description: error.message || "交易被拒绝或执行失败",
			variant: "destructive",
		});
		}
	};

	// ========================
	// 渲染
	// ========================
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 transition-colors duration-300">
		<div className="max-w-6xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
			<div className="flex items-center gap-3">
				<Coins className="h-8 w-8 text-blue-600" />
				<h1 className="text-3xl font-bold text-gray-900">ETH 质押平台</h1>
			</div>
			<ConnectButton />
			</div>

			{isConnected ? (
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
				{/* 账户信息 */}
				<Card className="shadow-lg hover:shadow-xl transition-shadow">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-blue-700">
					<Wallet className="h-5 w-5" />
					我的账户
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<div>
					<Label className="text-sm text-gray-600">钱包余额</Label>
					<p className="text-2xl font-bold mt-1">
						{balance ? formatNumber(Number(formatEther(balance.value)), 4) : "0.0000"} ETH
					</p>
					</div>
					<Separator />
					<div>
					<Label className="text-sm text-gray-600">已质押金额</Label>
					<p className="text-2xl font-bold text-blue-600 mt-1">
						{stakedAmount ? formatNumber(Number(formatEther(stakedAmount)), 4) : "0.0000"} ETH
					</p>
					</div>
					<Separator />
					<div>
						<Label className="text-sm text-gray-600">待领取奖励</Label>
						<div className="text-2xl font-bold text-green-600 mt-1 flex flex-col items-center">
							{rewards ? (
							<>
								<div className="mb-1">{rewards.toString()} wei</div>
								<div className="opacity-80 mb-1">≈</div>
								<div>{formatNumber(Number(formatEther(rewards)), 6)} ETH</div>
							</>
							) : (
							<>
								<div className="mb-1">0 wei</div>
								<div className="opacity-80 mb-1">≈</div>
								<div>0.000000 ETH</div>
							</>
							)}
						</div>
					</div>
				</CardContent>
				</Card>

				{/* 质押操作 */}
				<Card className="shadow-lg hover:shadow-xl transition-shadow">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-blue-700">
					<ArrowUpCircle className="h-5 w-5" />
					质押管理
					</CardTitle>
					<CardDescription>存入或取出您的ETH</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div>
					<Label htmlFor="stake-amount">质押金额 (ETH)</Label>
					<Input
						id="stake-amount"
						type="number"
						placeholder="0.0"
						min="0"
						step="0.01"
						value={stakeAmount}
						onChange={(e) => setStakeAmount(e.target.value)}
						disabled={isLoading}
						className="mt-1"
					/>
					</div>
					<Button
					onClick={handleStake}
					disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isLoading}
					className="w-full py-6 text-lg"
					>
					{isStakePending || isStakeLoading ? "⏳ 处理中..." : "➕ 质押"}
					</Button>

					<Separator className="my-4" />

					<div>
					<Label htmlFor="unstake-amount">解质押金额 (ETH)</Label>
					<Input
						id="unstake-amount"
						type="number"
						placeholder="0.0"
						min="0"
						step="0.01"
						value={unstakeAmount}
						onChange={(e) => setUnstakeAmount(e.target.value)}
						disabled={isLoading}
						className="mt-1"
					/>
					</div>
					<Button
					onClick={handleUnstake}
					disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
					variant="outline"
					className="w-full py-6 text-lg border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
					>
					<ArrowDownCircle className="h-4 w-4 mr-2" />
					{isUnstakePending || isUnstakeLoading ? "⏳ 处理中..." : "➖ 解质押"}
					</Button>
				</CardContent>
				</Card>

				{/* 奖励信息 */}
				<Card className="shadow-lg hover:shadow-xl transition-shadow">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-700">
					<TrendingUp className="h-5 w-5" />
					收益详情
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<div>
					<Label className="text-sm text-gray-600">平台总质押量</Label>
					<p className="text-2xl font-bold mt-1">
						{totalStaked ? formatNumber(Number(formatEther(totalStaked)), 4) : "0.00"} ETH
					</p>
					</div>
					<Separator />
					<div>
					<Label className="text-sm text-gray-600">年化收益率 (APY)</Label>
					<p className="text-2xl font-bold text-green-600 mt-1">{rewardRate ? `${rewardRate}%` : "12%"}</p>
					</div>
					<Separator />
					<Label className="text-sm text-gray-600">待领取奖励</Label>
					<div className="text-2xl font-bold text-green-600 mt-1 flex flex-col items-center">
						{rewards ? (
						<>
							<div className="mb-1">{rewards.toString()} wei</div>
							<div className="opacity-80 mb-1">≈</div>
							<div>{formatNumber(Number(formatEther(rewards)), 6)} ETH</div>
						</>
						) : (
						<>
							<div className="mb-1">0 wei</div>
							<div className="opacity-80 mb-1">≈</div>
							<div>0.000000 ETH</div>
						</>
						)}
					</div>
					<Button
					onClick={handleClaimRewards}
					disabled={!rewards || isLoading}
					variant="secondary"
					className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
					>
					{isClaimPending || isClaimLoading ? "⏳ 领取中..." : "💰 领取奖励"}
					</Button>
				</CardContent>
				</Card>

				{/* 👇 管理员面板（仅管理员可见） */}
				{isAdmin && (
				<Card className="lg:col-span-3 shadow-xl border-2 border-yellow-200 bg-yellow-50">
					<CardHeader>
					<CardTitle className="flex items-center gap-2 text-yellow-800">
						<Settings className="h-5 w-5" />
						管理员控制面板
					</CardTitle>
					<CardDescription>仅合约所有者可操作</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* 设置奖励率 */}
					<div className="space-y-3">
						<Label htmlFor="reward-rate">设置年化收益率 (%)</Label>
						<Input
						id="reward-rate"
						type="number"
						min="1"
						max="50"
						placeholder="例如: 12"
						value={newRewardRate}
						onChange={(e) => setNewRewardRate(e.target.value)}
						disabled={isLoading}
						/>
						<Button
						onClick={handleSetRewardRate}
						disabled={!newRewardRate || isLoading}
						className="w-full bg-blue-600 hover:bg-blue-700 text-white"
						>
						{isRatePending || isRateLoading ? "⏳ 更新中..." : "设置奖励率"}
						</Button>
					</div>

					{/* 存入奖励金 */}
					<div className="space-y-3">
						<Label htmlFor="deposit-amount">存入奖励金 (ETH)</Label>
						<Input
						id="deposit-amount"
						type="number"
						min="0.01"
						step="0.01"
						placeholder="例如: 1.0"
						value={depositAmount}
						onChange={(e) => setDepositAmount(e.target.value)}
						disabled={isLoading}
						/>
						<Button
						onClick={handleDepositRewards}
						disabled={!depositAmount || isLoading}
						className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
						>
						<DollarSign className="h-4 w-4" />
						{isDepositPending || isDepositLoading ? "⏳ 存入中..." : "存入奖励"}
						</Button>
					</div>

					{/* 紧急提取 */}
					<div className="space-y-3">
						<Label htmlFor="withdraw-amount">紧急提取 (ETH)</Label>
						<Input
						id="withdraw-amount"
						type="number"
						min="0.01"
						step="0.01"
						placeholder="超出部分"
						value={withdrawAmount}
						onChange={(e) => setWithdrawAmount(e.target.value)}
						disabled={isLoading}
						/>
						<Button
						onClick={handleEmergencyWithdraw}
						disabled={!withdrawAmount || isLoading}
						variant="destructive"
						className="w-full flex items-center justify-center gap-2"
						>
						<AlertTriangle className="h-4 w-4" />
						{isWithdrawPending || isWithdrawLoading ? "⏳ 提取中..." : "紧急提取"}
						</Button>
					</div>
					</CardContent>
				</Card>
				)}
			</div>
			) : (
			<Card className="text-center py-16 shadow-lg bg-white">
				<CardContent>
				<Wallet className="h-16 w-16 mx-auto mb-6 text-gray-400" />
				<h2 className="text-3xl font-bold text-gray-800 mb-3">欢迎使用质押平台</h2>
				<p className="text-lg text-gray-600 mb-6">连接您的钱包，开始质押并赚取收益！</p>
				<ConnectButton.Custom>
					{({ account, chain, openConnectModal }) => (
					<Button
						onClick={openConnectModal}
						className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
					>
						🔗 连接钱包
					</Button>
					)}
				</ConnectButton.Custom>
				</CardContent>
			</Card>
			)}
		</div>
		</div>
	);
}