import '@coinbase/onchainkit/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { type ReactNode } from 'react';
import { cookieToInitialState } from 'wagmi';
import { Providers } from './providers';
import { getConfig } from '../wagmi';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Base-BNPL | Decentralized Buy Now Pay Later',
  description: 'The first BNPL platform built on Base blockchain',
  openGraph: {
    title: 'Base-BNPL | Decentralized Buy Now Pay Later',
    description: 'The first BNPL platform built on Base blockchain',
    url: 'https://base-bnpl.xyz',
    siteName: 'BNPL',
    images: [
      {
        url: 'https://base-bnpl.xyz/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Base-BNPL | Decentralized Buy Now Pay Later',
    description: 'The first BNPL platform built on Base blockchain',
    images: ['https://base-bnpl.xyz/og-image.png'],
  },
};

export default async function RootLayout(props: { children: ReactNode }) {
  const headersList = await headers();
  const initialState = cookieToInitialState(
    getConfig(),
    headersList.get('cookie')
  );

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers initialState={initialState}>
          {props.children}
        </Providers>
      </body>
    </html>
  );
}