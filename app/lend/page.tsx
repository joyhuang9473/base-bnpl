'use client';

import { useState } from 'react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import { CONTRACT_ADDRESSES, LENDING_POOL_ABI, ERC20_ABI } from '../../lib/contracts';

interface LendingForm {
  amount: string;
  riskTier: 0 | 1 | 2; // LOW, MEDIUM, HIGH
  autoReinvest: boolean;
}

export default function LendPage() {
  const { address } = useAccount();
  const [form, setForm] = useState<LendingForm>({
    amount: '',
    riskTier: 0, // LOW
    autoReinvest: false
  });
  const [activeTab, setActiveTab] = useState<'deposit' | 'portfolio'>('deposit');
  const [step, setStep] = useState<'input' | 'approve' | 'deposit' | 'success'>('input');

  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  
  const { isLoading: isApprovalConfirming } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isLoading: isDepositConfirming } = useWaitForTransactionReceipt({ hash: depositHash });

  // Read real contract data
  const { data: usdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

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

  const handleApproval = () => {
    if (!form.amount) return;
    const amountInWei = parseUnits(form.amount, 6);
    
    writeApproval({
      address: CONTRACT_ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.LENDING_POOL, amountInWei]
    });
  };

  const handleDeposit = () => {
    if (!form.amount) return;
    const amountInWei = parseUnits(form.amount, 6);
    
    writeDeposit({
      address: CONTRACT_ADDRESSES.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: 'deposit',
      args: [amountInWei, form.riskTier]
    });
  };

  // Auto-advance steps
  if (approvalHash && !isApprovalConfirming && step === 'approve') {
    setStep('deposit');
  }
  if (depositHash && !isDepositConfirming && step === 'deposit') {
    setStep('success');
  }

  const formatPoolStats = () => {
    if (!poolStats) return null;
    
    return {
      totalLiquidity: Number(formatUnits(poolStats[0], 6)),
      totalLoaned: Number(formatUnits(poolStats[1], 6)),
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
      riskTier: Number(lenderPosition[3]),
      autoReinvest: lenderPosition[4]
    };
  };

  const formattedStats = formatPoolStats();
  const position = formatLenderPosition();

  if (!address) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-neutral-600 mb-8">Connect your wallet to start lending</p>
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
                <Link href="/lend" className="text-primary-600 font-medium">
                  Lend
                </Link>
                <Link href="/dashboard" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
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
        {/* Pool Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Total Liquidity</h3>
            <p className="text-2xl font-bold text-neutral-900">
              ${formattedStats ? formattedStats.totalLiquidity.toLocaleString() : '0'}
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Total Loaned</h3>
            <p className="text-2xl font-bold text-neutral-900">
              ${formattedStats ? formattedStats.totalLoaned.toLocaleString() : '0'}
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Utilization Rate</h3>
            <p className="text-2xl font-bold text-neutral-900">
              {formattedStats ? formattedStats.utilizationRate.toFixed(1) : '0'}%
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Average APY</h3>
            <p className="text-2xl font-bold text-success-600">
              {formattedStats ? formattedStats.averageAPY.toFixed(2) : '0'}%
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-neutral-600">Total Lenders</h3>
            <p className="text-2xl font-bold text-neutral-900">
              {formattedStats ? formattedStats.totalLenders : '0'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'deposit'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'portfolio'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 hover:text-primary-600'
            }`}
          >
            My Portfolio
          </button>
        </div>

        {/* Deposit Tab */}
        {activeTab === 'deposit' && step === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-8">Deposit USDC</h2>
                
                {/* USDC Balance */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Available Balance</h3>
                  <p className="text-2xl font-bold text-blue-700">
                    {usdcBalance ? Number(formatUnits(usdcBalance, 6)).toFixed(2) : '0.00'} USDC
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Deposit Amount (USDC)
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({...form, amount: e.target.value})}
                      className="input"
                      placeholder="1000.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Risk Tier
                    </label>
                    <select
                      value={form.riskTier}
                      onChange={(e) => setForm({...form, riskTier: parseInt(e.target.value) as 0 | 1 | 2})}
                      className="input"
                    >
                      <option value={0}>LOW - 4% APY (Safest loans)</option>
                      <option value={1}>MEDIUM - 8% APY (Balanced risk)</option>
                      <option value={2}>HIGH - 15% APY (Higher risk)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.autoReinvest}
                      onChange={(e) => setForm({...form, autoReinvest: e.target.checked})}
                      className="mr-2"
                    />
                    <label className="text-sm text-neutral-600">
                      Auto-reinvest yield
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => setStep('approve')}
                  disabled={!form.amount}
                  className="btn-primary w-full py-3 mt-8 disabled:opacity-50"
                >
                  Continue to Approval
                </button>
              </div>
            </div>

            {/* Risk Tier Info */}
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Risk Tiers</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-success-500 pl-4">
                    <h4 className="font-medium text-success-700">LOW Risk</h4>
                    <p className="text-sm text-neutral-600">4% APY • Loans to borrowers with 750+ credit scores</p>
                  </div>
                  <div className="border-l-4 border-warning-500 pl-4">
                    <h4 className="font-medium text-warning-700">MEDIUM Risk</h4>
                    <p className="text-sm text-neutral-600">8% APY • Loans to borrowers with 600-749 credit scores</p>
                  </div>
                  <div className="border-l-4 border-error-500 pl-4">
                    <h4 className="font-medium text-error-700">HIGH Risk</h4>
                    <p className="text-sm text-neutral-600">15% APY • Loans to borrowers with 300-599 credit scores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Step */}
        {activeTab === 'deposit' && step === 'approve' && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-8">Approve USDC</h2>
              
              <div className="bg-warning-50 border border-warning-200 p-4 rounded-xl mb-6">
                <p className="text-sm text-warning-800">
                  You&apos;re about to approve {form.amount} USDC for the LendingPool contract.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('input')}
                  className="btn-secondary px-6 py-3"
                >
                  Back
                </button>
                
                <button
                  onClick={handleApproval}
                  disabled={isApprovePending || isApprovalConfirming}
                  className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                  {isApprovePending ? 'Confirming...' : isApprovalConfirming ? 'Waiting...' : 'Approve USDC'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Step */}
        {activeTab === 'deposit' && step === 'deposit' && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-8">Deposit to Pool</h2>
              
              <div className="bg-success-50 border border-success-200 p-4 rounded-xl mb-6">
                <p className="text-sm text-success-800">
                  ✅ USDC approval successful! Now depositing {form.amount} USDC to {['LOW', 'MEDIUM', 'HIGH'][form.riskTier]} risk tier.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('approve')}
                  className="btn-secondary px-6 py-3"
                >
                  Back
                </button>
                
                <button
                  onClick={handleDeposit}
                  disabled={isDepositPending || isDepositConfirming}
                  className="btn-primary px-6 py-3 disabled:opacity-50"
                >
                  {isDepositPending ? 'Confirming...' : isDepositConfirming ? 'Waiting...' : 'Deposit USDC'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {activeTab === 'deposit' && step === 'success' && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">Deposit Successful!</h2>
              <p className="text-neutral-600 mb-4">
                Successfully deposited {form.amount} USDC into the {['LOW', 'MEDIUM', 'HIGH'][form.riskTier]} risk tier.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setStep('input');
                    setForm({amount: '', riskTier: 0, autoReinvest: false});
                  }}
                  className="btn-primary px-6 py-3"
                >
                  Deposit More
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="btn-secondary px-6 py-3"
                >
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">My Position</h2>
              
              {position && position.deposited > 0 ? (
                <div className="space-y-4">
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
                  
                  <div className="pt-4 border-t">
                    <button className="btn-primary w-full py-3">
                      Claim Yield
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600 mb-4">You haven&apos;t deposited any USDC yet.</p>
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className="btn-primary px-6 py-3"
                  >
                    Start Lending
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}