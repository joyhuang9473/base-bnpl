'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base, baseSepolia } from 'viem/chains';
import { type ReactNode, useState } from 'react';
import { type State, WagmiProvider } from 'wagmi';
import { getConfig } from '../wagmi';

export function Providers(props: {
  children: ReactNode;
  initialState?: State;
}) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={props.initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          projectId={process.env.NEXT_PUBLIC_CDP_PROJECT_ID}
          chain={process.env.NODE_ENV === 'development' ? baseSepolia : base}
          config={{
            appearance: {
              name: 'Base-BNPL',
              logo: '/logo.png',
              mode: 'auto',
              theme: 'default',
            },
            wallet: {
              display: 'modal',
              termsUrl: 'https://base-bnpl.xyz/terms',
              privacyUrl: 'https://base-bnpl.xyz/privacy',
            },
            paymaster: process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT,
          }}
        >
          {props.children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}