'use client';

import { useState } from 'react';
import { Avatar, Name, Address, EthBalance } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';
import { FundButton } from '@coinbase/onchainkit/fund';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

interface LendingForm {
  amount: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'MIXED';
  autoReinvest: boolean;
}

export default function LendPage() {
  const { address } = useAccount();
  const [form, setForm] = useState<LendingForm>({
    amount: '',
    riskTier: 'LOW',
    autoReinvest: false
  });
  const [activeTab, setActiveTab] = useState<'deposit' | 'portfolio'>('deposit');

  // Mock data
  const portfolioData = {
    totalDeposited: 5000,
    currentBalance: 5425,
    totalEarned: 425,
    apy: 8.5,
    positions: [
      { tier: 'LOW', amount: 2000, apy: 6.0, earned: 120 },
      { tier: 'MEDIUM', amount: 2000, apy: 10.0, earned: 200 },
      { tier: 'HIGH', amount: 1000, apy: 15.0, earned: 105 },
    ]
  };

  const poolStats = {
    totalLiquidity: 2500000,
    totalLoaned: 1750000,
    utilizationRate: 70,
    totalLenders: 156,
    averageAPY: 9.2
  };

  // Mock contract calls for demo
  const depositCalls = () => {
    if (!form.amount) return [];
    
    return [
      {
        to: '0x...' as const, // LendingPool address
        data: '0x...' as const, // deposit function call
        value: 0n,
      }
    ];
  };

  const riskTierInfo = {
    LOW: { apy: '4-6%', risk: 'Low', description: 'Conservative loans with high collateral ratios' },
    MEDIUM: { apy: '8-12%', risk: 'Medium', description: 'Balanced risk-return profile' },
    HIGH: { apy: '15-25%', risk: 'High', description: 'Higher yields with increased risk' },
    MIXED: { apy: '8-15%', risk: 'Diversified', description: 'Automatically balanced across all tiers' }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to start lending</p>
          <Wallet>
            <ConnectWallet className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Connect Wallet
            </ConnectWallet>
          </Wallet>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Base Lending</h1>
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <div className="p-4 border-b">
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </div>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Pool Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Liquidity</div>
            <div className="text-2xl font-bold text-green-600">
              ${poolStats.totalLiquidity.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Utilization Rate</div>
            <div className="text-2xl font-bold text-blue-600">
              {poolStats.utilizationRate}%
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Average APY</div>
            <div className="text-2xl font-bold text-purple-600">
              {poolStats.averageAPY}%
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Lenders</div>
            <div className="text-2xl font-bold text-indigo-600">
              {poolStats.totalLenders}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'deposit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Deposit Funds
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'portfolio'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Portfolio
              </button>
            </nav>
          </div>

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Deposit Form */}
                <div>
                  <h2 className="text-xl font-semibold mb-6">Deposit USDC</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deposit Amount (USDC)
                      </label>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm({...form, amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Risk Preference
                      </label>
                      <select
                        value={form.riskTier}
                        onChange={(e) => setForm({...form, riskTier: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="LOW">Low Risk (4-6% APY)</option>
                        <option value="MEDIUM">Medium Risk (8-12% APY)</option>
                        <option value="HIGH">High Risk (15-25% APY)</option>
                        <option value="MIXED">Mixed Portfolio (Auto-balanced)</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">
                        {riskTierInfo[form.riskTier].risk} Risk Profile
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        Expected APY: {riskTierInfo[form.riskTier].apy}
                      </p>
                      <p className="text-sm text-blue-700">
                        {riskTierInfo[form.riskTier].description}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.autoReinvest}
                        onChange={(e) => setForm({...form, autoReinvest: e.target.checked})}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">
                        Auto-reinvest earnings
                      </label>
                    </div>

                    {/* Need USDC? */}
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Need USDC? Buy with fiat:
                      </p>
                      <FundButton 
                        text="Buy USDC"
                        className="w-full mb-4"
                      />
                    </div>

                    {/* Transaction Component */}
                    <Transaction
                      chainId={baseSepolia.id}
                      calls={depositCalls()}
                      isSponsored={true}
                      onStatus={(status) => {
                        console.log('Deposit status:', status);
                      }}
                      onSuccess={(receipt) => {
                        console.log('Deposit successful:', receipt);
                      }}
                    >
                      <TransactionButton 
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        text="Deposit USDC"
                      />
                      <TransactionStatus>
                        <TransactionStatusLabel />
                      </TransactionStatus>
                    </Transaction>
                  </div>
                </div>

                {/* Risk Tier Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Risk Tier Breakdown</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-green-600">Low Risk</span>
                        <span className="text-sm text-gray-600">4-6% APY</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Credit scores 750+, high collateral ratios
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{width: '60%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">60% of pool</div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-yellow-600">Medium Risk</span>
                        <span className="text-sm text-gray-600">8-12% APY</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Credit scores 600-749, standard collateral
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{width: '30%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">30% of pool</div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-red-600">High Risk</span>
                        <span className="text-sm text-gray-600">15-25% APY</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Credit scores 300-599, minimum collateral
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{width: '10%'}}></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">10% of pool</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="p-6">
              {/* Portfolio Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Total Deposited</div>
                  <div className="text-xl font-bold text-blue-900">
                    ${portfolioData.totalDeposited.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Current Balance</div>
                  <div className="text-xl font-bold text-green-900">
                    ${portfolioData.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">Total Earned</div>
                  <div className="text-xl font-bold text-purple-900">
                    ${portfolioData.totalEarned.toLocaleString()}
                  </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm text-indigo-600">Average APY</div>
                  <div className="text-xl font-bold text-indigo-900">
                    {portfolioData.apy}%
                  </div>
                </div>
              </div>

              {/* Position Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Position Details</h3>
                <div className="space-y-4">
                  {portfolioData.positions.map((position, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-medium ${
                          position.tier === 'LOW' ? 'text-green-600' :
                          position.tier === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {position.tier} Risk
                        </span>
                        <span className="text-sm text-gray-600">{position.apy}% APY</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Deposited:</span>
                          <div className="font-medium">${position.amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Earned:</span>
                          <div className="font-medium text-green-600">${position.earned}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Value:</span>
                          <div className="font-medium">${(position.amount + position.earned).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Withdraw Button */}
                <div className="mt-6">
                  <Transaction
                    chainId={baseSepolia.id}
                    calls={[]} // withdraw calls
                    onStatus={(status) => {
                      console.log('Withdraw status:', status);
                    }}
                  >
                    <TransactionButton 
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      text="Withdraw Funds"
                    />
                    <TransactionStatus>
                      <TransactionStatusLabel />
                    </TransactionStatus>
                  </Transaction>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}