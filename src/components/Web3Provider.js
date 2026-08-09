"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { useState } from 'react';

// Setup Wagmi Config targeting Sepolia testnet
const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // Uses real browser wallets like MetaMask
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

export default function Web3Provider({ children }) {
  // Use state to ensure QueryClient is created once per session
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
