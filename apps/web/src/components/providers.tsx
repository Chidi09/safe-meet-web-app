"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "viem/chains";
import { Toaster } from "sonner";

// ------------------------------------------------------------
// Wagmi / RainbowKit config
// ------------------------------------------------------------

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "local-dev-project-id";

const wagmiConfig = getDefaultConfig({
  appName: "SafeMeet",
  projectId: walletConnectProjectId,
  chains: [baseSepolia],
  ssr: true,
});

// ------------------------------------------------------------
// QueryClient singleton
// ------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// ------------------------------------------------------------
// useWallet — thin wrapper over wagmi useAccount
// ------------------------------------------------------------

export function useWallet(): { walletAddress: string | null; isConnected: boolean } {
  const { address, isConnected } = useAccount();
  return {
    walletAddress: isConnected && address ? address : null,
    isConnected,
  };
}

// ------------------------------------------------------------
// Providers tree
// ------------------------------------------------------------

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#201f22",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e5e1e4",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
