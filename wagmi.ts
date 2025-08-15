import { http, cookieStorage, createConfig, createStorage, fallback } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors';

export function getConfig() {
  return createConfig({
    chains: [base, baseSepolia],
    connectors: [
      coinbaseWallet({
        appName: 'Base-BNPL',
        preference: 'all',
        version: '4',
      }),
      metaMask(),
      ...(process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ? [
        walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
        })
      ] : []),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: fallback([
        http('https://mainnet.base.org'),
        http('https://base-rpc.publicnode.com'),
        http('https://base.meowrpc.com'),
      ]),
      [baseSepolia.id]: fallback([
        http('https://sepolia.base.org'),
        http('https://base-sepolia-rpc.publicnode.com'),
        http('https://base-sepolia.blockpi.network/v1/rpc/public'),
      ]),
    },
  });
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}