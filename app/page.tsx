'use client';

import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { FarcasterProfile } from '../components/FarcasterProfile';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { address } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-primary-600">Base BNPL</h1>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <nav className="hidden md:flex space-x-6 lg:space-x-8">
                <Link href="/borrow" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
                  Borrow
                </Link>
                <Link href="/lend" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
                  Lend
                </Link>
                <Link href="/dashboard" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
                  Dashboard
                </Link>
              </nav>
              <Wallet>
                <ConnectWallet className="btn-primary text-sm sm:text-base px-3 sm:px-4 py-2">
                  <FarcasterProfile avatarSize="h-4 w-4 sm:h-5 sm:w-5" />
                </ConnectWallet>
                <WalletDropdown>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">Buy now,</span>
            <span className="block text-primary-600">pay later</span>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-neutral-600 leading-relaxed px-2">
            The first decentralized BNPL platform on Base. Transparent, secure, and designed for the future of finance.
          </p>
          
          {address ? (
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <button
                onClick={() => router.push('/borrow')}
                className="btn-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
              >
                Start borrowing
              </button>
              <button
                onClick={() => router.push('/lend')}
                className="btn-secondary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
              >
                Start earning
              </button>
            </div>
          ) : (
            <div className="mt-8 sm:mt-10 px-4">
              <Wallet>
                <ConnectWallet className="btn-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto">
                  Connect wallet to get started
                </ConnectWallet>
              </Wallet>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 sm:mt-24">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            <div className="card p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3 sm:mb-4">Instant approvals</h3>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Get approved in seconds with our on-chain credit scoring and automated risk assessment system.
              </p>
            </div>

            <div className="card p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3 sm:mb-4">Transparent terms</h3>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                All fees, rates, and terms are visible on-chain with complete transparency and no hidden charges.
              </p>
            </div>

            <div className="card p-6 sm:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3 sm:mb-4">Competitive yields</h3>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Lenders earn attractive returns by providing liquidity to fund consumer purchases with built-in risk management.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24">
          <div className="card p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-neutral-900 mb-4">
                Built on Base blockchain
              </h2>
              <p className="text-xl text-neutral-600">
                Powered by smart contracts and onchain transparency
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <dt className="text-sm font-medium text-neutral-500 mb-2">
                  Lender APY
                </dt>
                <dd className="text-4xl font-bold text-primary-600">
                  8-15%
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-sm font-medium text-neutral-500 mb-2">
                  Approval time
                </dt>
                <dd className="text-4xl font-bold text-primary-600">
                  &lt;30s
                </dd>
              </div>
              <div className="text-center">
                <dt className="text-sm font-medium text-neutral-500 mb-2">
                  Default rate
                </dt>
                <dd className="text-4xl font-bold text-primary-600">
                  &lt;5%
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}