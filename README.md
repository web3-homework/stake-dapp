# 质押 DApp 项目

一个基于以太坊的去中心化质押应用，用户可以质押ETH并获得奖励。现已集成RainbowKit钱包连接。

## 功能特性

- 🔗 **RainbowKit钱包连接**: 支持多种钱包（MetaMask、WalletConnect、Coinbase等）
- 💰 **ETH质押**: 用户可以质押ETH到智能合约
- 📈 **收益计算**: 自动计算基于时间的质押奖励
- 💸 **解质押**: 随时提取质押的ETH
- 🎁 **奖励领取**: 领取累积的质押奖励
- 📊 **实时数据**: 显示质押金额、奖励和总体统计
- 🌐 **多链支持**: 支持主网、测试网等多个网络

## 技术栈

### 前端
- **Next.js 14**: React框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: UI组件库
- **RainbowKit**: 钱包连接库
- **Wagmi**: React Hooks for Ethereum
- **Viem**: TypeScript Interface for Ethereum

### 智能合约
- **Solidity 0.8.19**: 智能合约语言
- **OpenZeppelin**: 安全的合约库
- **Hardhat**: 开发框架

### 测试
- **Hardhat**: 测试框架
- **Chai**: 断言库
- **Mocha**: 测试运行器

## 快速开始

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 环境配置

复制 `.env.example` 到 `.env` 并填入相应的配置：

\`\`\`bash
cp .env.example .env
\`\`\`

**重要**: 需要从 [WalletConnect Cloud](https://cloud.walletconnect.com) 获取项目ID并设置 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### 3. 编译合约

\`\`\`bash
npm run compile
\`\`\`

### 4. 运行测试

\`\`\`bash
npm run test
\`\`\`

### 5. 启动本地节点

\`\`\`bash
npm run node
\`\`\`

### 6. 部署合约

\`\`\`bash
npm run deploy
\`\`\`

### 7. 更新合约地址

在 `app/page.tsx` 中更新 `STAKING_CONTRACT_ADDRESS` 为实际部署的合约地址。

### 8. 启动前端

\`\`\`bash
npm run dev
\`\`\`

访问 `http://localhost:3000` 查看应用。

## RainbowKit 配置

### 支持的钱包

- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- Argent
- Trust Wallet
- Ledger
- 以及更多...

### 支持的网络

- Ethereum Mainnet
- Polygon
- Optimism
- Arbitrum
- Base
- Sepolia (测试网)

### 自定义配置

在 `app/providers.tsx` 中可以自定义：

- 添加更多钱包
- 配置支持的网络
- 设置应用名称和项目ID

## 合约功能

### 主要功能

- `stake()`: 质押ETH
- `unstake(uint256 amount)`: 解质押指定数量的ETH
- `claimRewards()`: 领取奖励
- `getStakedAmount(address user)`: 查询用户质押金额
- `getRewards(address user)`: 查询用户待领取奖励

### 管理员功能

- `setRewardRate(uint256 newRate)`: 设置年化收益率
- `depositRewards()`: 向合约存入奖励资金
- `emergencyWithdraw(uint256 amount)`: 紧急提取

## 安全特性

- **重入攻击防护**: 使用OpenZeppelin的ReentrancyGuard
- **权限控制**: 管理员功能受Ownable保护
- **安全数学**: 使用SafeMath防止溢出
- **输入验证**: 全面的参数验证
- **类型安全**: 使用TypeScript和Viem确保类型安全

## 测试覆盖

测试用例覆盖以下场景：

- ✅ 合约部署和初始化
- ✅ ETH质押功能
- ✅ 解质押功能
- ✅ 奖励计算和领取
- ✅ 管理员功能
- ✅ 边界情况和错误处理
- ✅ 多用户交互

## 部署指南

### 测试网部署

1. 获取测试网ETH (Sepolia)
2. 配置 `.env` 文件中的网络参数
3. 运行部署脚本：

\`\`\`bash
npx hardhat run scripts/deploy.js --network sepolia
\`\`\`

### 主网部署

⚠️ **警告**: 主网部署需要真实的ETH，请确保充分测试。

\`\`\`bash
npx hardhat run scripts/deploy.js --network mainnet
\`\`\`

## 前端使用

1. 确保已配置WalletConnect项目ID
2. 点击"Connect Wallet"按钮选择钱包
3. 连接到正确的网络（本地/测试网/主网）
4. 开始质押ETH并获得奖励！

## RainbowKit 优势

- **更好的用户体验**: 美观的钱包选择界面
- **多钱包支持**: 支持20+种主流钱包
- **自动网络切换**: 智能检测和切换网络
- **移动端优化**: 完美支持移动端钱包
- **主题定制**: 支持亮色/暗色主题
- **类型安全**: 完整的TypeScript支持

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License
