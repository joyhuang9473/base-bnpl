'use client';

import { useState, useEffect } from 'react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Copy, Check, ExternalLink, ArrowRight, DollarSign, Users, TrendingUp, Zap } from 'lucide-react';

interface MerchantStats {
  totalSales: string;
  totalTransactions: number;
  avgOrderValue: string;
  conversionIncrease: string;
}

interface Transaction {
  id: string;
  customer: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  paymentPlan: string;
}

export default function MerchantsPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'integration' | 'transactions' | 'analytics'>('overview');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [widgetCopied, setWidgetCopied] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Real merchant stats would come from contract events or subgraph
  // For now showing calculated stats based on mock structure
  const merchantStats: MerchantStats = {
    totalSales: '$0.00', // Would be calculated from loan totals
    totalTransactions: 0, // Would be number of loans funded
    avgOrderValue: '$0.00', // Would be average loan amount
    conversionIncrease: '0.0%' // Would be calculated from historical data
  };

  // Real transactions would come from contract events filtered by merchant
  const recentTransactions: Transaction[] = [
    // This would be populated by querying PaymentController events
    // filtered by merchant address
  ];

  const apiKey = '0xMERCHANT_API_KEY_' + address?.slice(2, 10);
  
  const widgetCode = `<!-- Base-BNPL Widget -->
<script src="https://base-bnpl.xyz/widget.js"></script>
<div id="base-bnpl-checkout" 
     data-amount="299.99" 
     data-merchant-id="${address?.slice(2, 10)}">
</div>

<script>
  window.BaseBNPL.init({
    apiKey: '${apiKey}',
    environment: 'production', // or 'sandbox'
    onSuccess: function(transaction) {
      console.log('Payment successful:', transaction);
    },
    onError: function(error) {
      console.error('Payment error:', error);
    }
  });
</script>`;

  const copyToClipboard = (text: string, setCopiedState: (value: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const registerMerchant = async () => {
    // Real merchant registration would involve:
    // 1. Transaction to register merchant in PaymentController
    // 2. Setting merchant parameters (fees, terms, etc.)
    try {
      setIsRegistered(true);
      // Would use Transaction component with registerMerchant contract call
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  useEffect(() => {
    // Check if merchant is already registered
    if (address) {
      // Real implementation would check merchant registration in PaymentController
      // For now, assume all connected wallets can be merchants
      setIsRegistered(true);
    }
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">Base-BNPL</h1>
              </Link>
              <Wallet>
                <ConnectWallet>
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
              </Wallet>
            </div>
          </div>
        </header>

        {/* Connect Wallet Message */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-500 mb-4">
              <Users className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Merchant Dashboard
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Connect your wallet to access merchant tools and analytics
            </p>
            <Wallet>
              <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">
                Connect Wallet
              </ConnectWallet>
            </Wallet>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Base-BNPL</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-8">
                <Link href="/borrow" className="text-gray-600 hover:text-blue-600">
                  Borrow
                </Link>
                <Link href="/lend" className="text-gray-600 hover:text-blue-600">
                  Lend
                </Link>
                <span className="text-blue-600 font-medium">Merchants</span>
              </nav>
              <Wallet>
                <ConnectWallet>
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
                <WalletDropdown>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isRegistered ? (
          /* Registration Flow */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-8">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Register as a Merchant
                </h2>
                <p className="text-gray-600">
                  Join Base-BNPL to offer flexible payment options and increase your sales
                </p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Instant Settlement</h3>
                    <p className="text-gray-600">Receive payment immediately while customers pay over time</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Increase Conversions</h3>
                    <p className="text-gray-600">Average 40% increase in new customers and 85% higher order values</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">No Chargeback Risk</h3>
                    <p className="text-gray-600">Blockchain immutability protects against fraud and chargebacks</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Transparent Fees</h3>
                    <p className="text-gray-600">Simple 3-6% transaction fee, no hidden charges</p>
                  </div>
                </div>
              </div>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                onClick={registerMerchant}
              >
                Register as Merchant
              </button>
            </div>
          </div>
        ) : (
          /* Dashboard */
          <>
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
              <p className="text-gray-600">Manage your Base-BNPL integration and view analytics</p>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: TrendingUp },
                  { id: 'integration', label: 'Integration', icon: Zap },
                  { id: 'transactions', label: 'Transactions', icon: DollarSign },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as 'overview' | 'integration' | 'transactions' | 'analytics')}
                    className={`${
                      activeTab === id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-gray-900">{merchantStats.totalSales}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">{merchantStats.totalTransactions}</p>
                      </div>
                      <ArrowRight className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                        <p className="text-2xl font-bold text-gray-900">{merchantStats.avgOrderValue}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Conversion Increase</p>
                        <p className="text-2xl font-bold text-green-600">{merchantStats.conversionIncrease}</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Plan
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tx.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.customer}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {tx.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.paymentPlan}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                tx.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : tx.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {tx.date}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                              No transactions yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integration' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Merchant ID
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                          {address?.slice(2, 10)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(address?.slice(2, 10) || '', setApiKeyCopied)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          {apiKeyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                          {apiKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey, setApiKeyCopied)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          {apiKeyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Widget Integration</h3>
                    <button
                      onClick={() => copyToClipboard(widgetCode, setWidgetCopied)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {widgetCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{widgetCopied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{widgetCode}</code>
                  </pre>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Guide</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Copy the widget code</h4>
                        <p className="text-gray-600">Add the Base-BNPL widget to your checkout page</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Configure your environment</h4>
                        <p className="text-gray-600">Set up your API key and merchant ID</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Test the integration</h4>
                        <p className="text-gray-600">Use our sandbox environment to test transactions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Go live</h4>
                        <p className="text-gray-600">Switch to production and start accepting payments</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <Link 
                        href="/docs" 
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                      >
                        <span>View Documentation</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <Link 
                        href="/support" 
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                      >
                        <span>Get Support</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">All Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tx.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.customer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.paymentPlan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tx.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button className="text-blue-600 hover:text-blue-700">View Details</button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            No transactions yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Analytics</h3>
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Analytics dashboard coming soon</p>
                    <p className="text-sm text-gray-400 mt-2">
                      We&apos;re building advanced analytics to help you understand your BNPL performance
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}