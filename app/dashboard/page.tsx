'use client';

import { useState } from 'react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits } from 'viem';
import Link from 'next/link';
import { CONTRACT_ADDRESSES, PAYMENT_CONTROLLER_ABI, LENDING_POOL_ABI, ERC20_ABI } from '../../lib/contracts';

// Loan status mapping
const LOAN_STATUS = {
  0: 'PENDING',
  1: 'APPROVED', 
  2: 'ACTIVE',
  3: 'COMPLETED',
  4: 'DEFAULTED',
  5: 'LIQUIDATED'
} as const;

// Individual loan card component
function LoanCard({ loanId }: { loanId: bigint }) {
  const { data: loanData } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'loans',
    args: [loanId],
  });

  if (!loanData) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-4 bg-neutral-200 rounded w-1/4 mb-3"></div>
        <div className="h-3 bg-neutral-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
      </div>
    );
  }

  // Destructure the loan data tuple
  const [
    id,
    borrower, // eslint-disable-line @typescript-eslint/no-unused-vars
    merchant, // eslint-disable-line @typescript-eslint/no-unused-vars
    principal,
    totalAmount,
    collateralAmount,
    collateralToken,
    status,
    createdAt,
    nextPaymentDue, // eslint-disable-line @typescript-eslint/no-unused-vars
    paidAmount,
    remainingAmount,
    riskTier
  ] = loanData;

  const statusText = LOAN_STATUS[Number(status) as keyof typeof LOAN_STATUS] || 'UNKNOWN';
  const riskTierText = ['LOW', 'MEDIUM', 'HIGH'][Number(riskTier)] || 'UNKNOWN';
  const isTokenUSDC = collateralToken.toLowerCase() === CONTRACT_ADDRESSES.USDC.toLowerCase();

  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-neutral-900 mb-1">
            Loan #{Number(id)}
          </h4>
          <p className="text-sm text-neutral-600">
            Created {new Date(Number(createdAt) * 1000).toLocaleDateString()}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          statusText === 'ACTIVE' ? 'bg-success-100 text-success-700' :
          statusText === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
          statusText === 'PENDING' ? 'bg-warning-100 text-warning-700' :
          statusText === 'COMPLETED' ? 'bg-green-100 text-green-700' :
          'bg-error-100 text-error-700'
        }`}>
          {statusText}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-neutral-600">Principal</p>
          <p className="font-semibold">${Number(formatUnits(principal, 6)).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-neutral-600">Total Amount</p>
          <p className="font-semibold">${Number(formatUnits(totalAmount, 6)).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-neutral-600">Paid</p>
          <p className="font-semibold text-success-600">${Number(formatUnits(paidAmount, 6)).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-neutral-600">Remaining</p>
          <p className="font-semibold text-warning-600">${Number(formatUnits(remainingAmount, 6)).toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-neutral-600">Collateral: </span>
            <span className="font-medium">
              {Number(formatUnits(collateralAmount, isTokenUSDC ? 6 : 18)).toFixed(isTokenUSDC ? 2 : 4)} {isTokenUSDC ? 'USDC' : 'ETH'}
            </span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              riskTierText === 'LOW' ? 'bg-success-100 text-success-700' :
              riskTierText === 'MEDIUM' ? 'bg-warning-100 text-warning-700' :
              'bg-error-100 text-error-700'
            }`}>
              {riskTierText} RISK
            </span>
          </div>
          {statusText === 'ACTIVE' && Number(remainingAmount) > 0 && (
            <button className="btn-primary px-4 py-2">
              Make Payment
            </button>
          )}
          {statusText === 'APPROVED' && (
            <button className="btn-secondary px-4 py-2">
              Fund Loan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'lending'>('overview');

  // Read contract data
  const { data: poolStats } = useReadContract({
    address: CONTRACT_ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getPoolStats',
  });

  const { data: lenderPosition } = useReadContract({
    address: CONTRACT_ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getLenderPosition',
    args: address ? [address] : undefined,
  });

  const { data: borrowerLoans } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'borrowerLoans',
    args: address ? [address] : undefined,
  });

  const { data: usdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract: claimYield, isPending: isClaimPending } = useWriteContract();

  const handleClaimYield = () => {
    claimYield({
      address: CONTRACT_ADDRESSES.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: 'claimYield',
    });
  };

  const formatPoolStats = () => {
    if (!poolStats) return null;
    
    return {
      totalLiquidity: Number(formatUnits(poolStats[0], 6)),
      totalLoaned: Number(formatUnits(poolStats[1], 6)),
      totalYieldPaid: Number(formatUnits(poolStats[2], 6)),
      totalDefaulted: Number(formatUnits(poolStats[3], 6)),
      utilizationRate: Number(poolStats[4]) / 100,
      averageAPY: Number(poolStats[5]) / 100,
      totalLenders: Number(poolStats[6]),
      totalBorrowers: Number(poolStats[7])
    };
  };

  const formatLenderPosition = () => {
    if (!lenderPosition) return null;
    
    return {
      deposited: Number(formatUnits(lenderPosition[0], 6)),
      yieldEarned: Number(formatUnits(lenderPosition[1], 6)),
      lastUpdateTime: Number(lenderPosition[2]),
      riskTier: Number(lenderPosition[3]),
      autoReinvest: lenderPosition[4]
    };
  };

  const formattedStats = formatPoolStats();
  const position = formatLenderPosition();
  const totalLoans = borrowerLoans ? borrowerLoans.length : 0;

  if (!address) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-neutral-600 mb-8">Connect your wallet to view your dashboard</p>
          <Wallet>
            <ConnectWallet className="btn-primary">
              Connect Wallet
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-primary-600">
                Base BNPL
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/borrow" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
                  Borrow
                </Link>
                <Link href="/lend" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
                  Lend
                </Link>
                <Link href="/dashboard" className="text-primary-600 font-medium">
                  Dashboard
                </Link>
              </nav>
            </div>
            <Wallet>
              <ConnectWallet className="btn-primary">
                <Avatar className="h-4 w-4" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Dashboard</h1>
          <p className="text-neutral-600">
            Manage your loans, lending positions, and track protocol activity
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">USDC Balance</h3>
            <p className="text-2xl font-bold text-neutral-900">
              ${usdcBalance ? Number(formatUnits(usdcBalance, 6)).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Active Loans</h3>
            <p className="text-2xl font-bold text-neutral-900">{totalLoans}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Lending Position</h3>
            <p className="text-2xl font-bold text-success-600">
              ${position ? position.deposited.toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Yield Earned</h3>
            <p className="text-2xl font-bold text-success-600">
              ${position ? position.yieldEarned.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            Protocol Overview
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'loans'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            My Loans ({totalLoans})
          </button>
          <button
            onClick={() => setActiveTab('lending')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'lending'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            My Lending
          </button>
        </div>

        {/* Protocol Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Pool Statistics */}
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Protocol Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Liquidity</h3>
                  <p className="text-3xl font-bold text-primary-600">
                    ${formattedStats ? formattedStats.totalLiquidity.toLocaleString() : '0'}
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Total Loaned</h3>
                  <p className="text-3xl font-bold text-neutral-900">
                    ${formattedStats ? formattedStats.totalLoaned.toLocaleString() : '0'}
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Utilization Rate</h3>
                  <p className="text-3xl font-bold text-warning-600">
                    {formattedStats ? formattedStats.utilizationRate.toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-medium text-neutral-600 mb-2">Average APY</h3>
                  <p className="text-3xl font-bold text-success-600">
                    {formattedStats ? formattedStats.averageAPY.toFixed(2) : '0'}%
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Participants</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Lenders:</span>
                    <span className="font-semibold">{formattedStats ? formattedStats.totalLenders : '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Borrowers:</span>
                    <span className="font-semibold">{formattedStats ? formattedStats.totalBorrowers : '0'}</span>
                  </div>
                </div>
              </div>
              
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Yield Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Yield Paid:</span>
                    <span className="font-semibold text-success-600">
                      ${formattedStats ? formattedStats.totalYieldPaid.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Defaulted:</span>
                    <span className="font-semibold text-error-600">
                      ${formattedStats ? formattedStats.totalDefaulted.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/borrow" className="btn-primary w-full py-2 text-center block">
                    Apply for Loan
                  </Link>
                  <Link href="/lend" className="btn-secondary w-full py-2 text-center block">
                    Start Lending
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">My Loans</h2>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-neutral-600">
                    {totalLoans > 0 ? `You have ${totalLoans} demo loan(s)` : 'Loan Management'}
                  </p>
                  <Link href="/borrow" className="btn-secondary px-4 py-2">
                    Apply for New Loan
                  </Link>
                </div>
                
                {totalLoans > 0 ? (
                  <div className="space-y-4">
                    {borrowerLoans?.map((loanId: bigint) => (
                      <LoanCard key={loanId.toString()} loanId={loanId} />
                    ))}
                  </div>
                ) : (
                  <div className="card p-6">
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-xl text-blue-600">💰</span>
                      </div>
                      <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                        No Loans Yet
                      </h4>
                      <p className="text-sm text-neutral-600 mb-4">
                        Create your first loan to see it here. 
                      </p>
                      <Link href="/borrow" className="btn-primary px-4 py-2">
                        Apply for Loan
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Lending Tab */}
        {activeTab === 'lending' && (
          <div className="space-y-6">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">My Lending Position</h2>
              
              {position && position.deposited > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Position Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Total Deposited:</span>
                        <span className="font-semibold">${position.deposited.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Yield Earned:</span>
                        <span className="font-semibold text-success-600">${position.yieldEarned.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Risk Tier:</span>
                        <span className="font-semibold">{['LOW', 'MEDIUM', 'HIGH'][position.riskTier]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Auto-reinvest:</span>
                        <span className="font-semibold">{position.autoReinvest ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleClaimYield}
                        disabled={isClaimPending || position.yieldEarned <= 0}
                        className="btn-primary w-full py-3 disabled:opacity-50"
                      >
                        {isClaimPending ? 'Claiming...' : `Claim Yield ($${position.yieldEarned.toFixed(2)})`}
                      </button>
                      <Link href="/lend" className="btn-secondary w-full py-3 text-center block">
                        Deposit More
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Lending Position</h3>
                  <p className="text-neutral-600 mb-6">Start lending to earn yield on your USDC.</p>
                  <Link href="/lend" className="btn-primary px-6 py-3">
                    Start Lending
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}