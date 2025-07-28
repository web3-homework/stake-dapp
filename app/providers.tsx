"use client"

import type * as React from "react"
import { RainbowKitProvider, getDefaultWallets, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { argentWallet, trustWallet, ledgerWallet } from "@rainbow-me/rainbowkit/wallets"
import { arbitrum, base, mainnet, optimism, polygon, sepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"

const { wallets } = getDefaultWallets()

const config = getDefaultConfig({
  appName: "质押 DApp",
  projectId: "2f5a2b1c8d3e4f5a6b7c8d9e0f1a2b3c", // 示例项目ID，请替换为您的实际项目ID
  wallets: [
    ...wallets,
    {
      groupName: "Other",
      wallets: [argentWallet, trustWallet, ledgerWallet],
    },
  ],
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
