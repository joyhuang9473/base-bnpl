'use client';

import { useState } from 'react';
import { Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel } from '@coinbase/onchainkit/transaction';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import Link from 'next/link';

interface Loan {
  id: number;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  status: 'active' | 'completed' | 'overdue';
  installments: number;
  installmentsPaid: number;
  merchant: string;
  createdAt: string;
}

interface Payment {
  id: number;
  loanId: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  lateFee?: number;
}

export default function DashboardPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'payments'>('overview');

  // Mock data
  const loans: Loan[] = [
    {
      id: 1,
      amount: 500,
      totalAmount: 500, // 0% interest
      paidAmount: 250,
      remainingAmount: 250,
      nextPaymentDate: '2024-01-15',
      nextPaymentAmount: 125,
      status: 'active',
      installments: 4,
      installmentsPaid: 2,
      merchant: 'TechShop',
      createdAt: '2023-12-01'
    },
    {
      id: 2,
      amount: 300,
      totalAmount: 309, // 3% interest
      paidAmount: 309,
      remainingAmount: 0,
      nextPaymentDate: '',
      nextPaymentAmount: 0,
      status: 'completed',
      installments: 6,
      installmentsPaid: 6,
      merchant: 'Fashion Store',
      createdAt: '2023-10-15'
    }
  ];

  const upcomingPayments: Payment[] = [
    {
      id: 1,
      loanId: 1,
      amount: 125,
      dueDate: '2024-01-15',
      status: 'pending'
    },
    {
      id: 2,
      loanId: 1,
      amount: 125,
      dueDate: '2024-01-29',
      status: 'pending'
    }
  ];

  const paymentHistory: Payment[] = [
    {
      id: 3,
      loanId: 1,
      amount: 125,
      dueDate: '2024-01-01',
      paidDate: '2023-12-31',
      status: 'paid'
    },
    {
      id: 4,
      loanId: 1,
      amount: 125,
      dueDate: '2023-12-15',
      paidDate: '2023-12-14',
      status: 'paid'
    }
  ];

  const creditScore = 785;
  const totalBorrowed = 800;
  const totalRepaid = 559;
  const onTimePayments = 8;
  const totalPayments = 8;

  // Mock contract calls
  const makePaymentCalls = () => {
    return [
      {
        to: '0x...' as const, // PaymentController address
        data: '0x...' as const, // makePayment function call
        value: BigInt(0),
      }
    ];
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to view your dashboard</p>
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
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-semibold text-blue-600">
                BNPL on Base
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/dashboard" className="text-blue-600 font-medium">
                  Dashboard
                </Link>
                <Link href="/borrow" className="text-gray-600 hover:text-blue-600">
                  New Loan
                </Link>
              </nav>
            </div>
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
                </div>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Credit Score Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium mb-2">Your Credit Score</h2>
              <div className="text-4xl font-bold">{creditScore}</div>
              <div className="text-blue-100">Excellent • Low Risk Tier</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100 mb-1">Payment History</div>
              <div className="text-2xl font-bold">{Math.round((onTimePayments/totalPayments) * 100)}%</div>
              <div className="text-blue-100">On-time payments</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Borrowed</div>
            <div className="text-2xl font-bold text-gray-900">
              ${totalBorrowed.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Repaid</div>
            <div className="text-2xl font-bold text-green-600">
              ${totalRepaid.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600">Outstanding Balance</div>
            <div className="text-2xl font-bold text-blue-600">
              ${(totalBorrowed - totalRepaid).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('loans')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'loans'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Loans
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'payments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Payment History
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upcoming Payments */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upcoming Payments</h3>
                  {upcomingPayments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingPayments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Loan #{payment.loanId}</span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              new Date(payment.dueDate) < new Date() 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              Due {payment.dueDate}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">${payment.amount}</span>
                            <Transaction
                              chainId={baseSepolia.id}
                              calls={makePaymentCalls()}
                              isSponsored={true}
                              onSuccess={() => {
                                console.log('Payment successful');
                              }}
                            >
                              <TransactionButton 
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                text="Pay Now"
                              />
                            </Transaction>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No upcoming payments
                    </div>
                  )}
                </div>

                {/* Active Loans Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Loans</h3>
                  <div className="space-y-4">
                    {loans.filter(loan => loan.status === 'active').map((loan) => (
                      <div key={loan.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{loan.merchant}</span>
                          <span className="text-sm text-gray-600">
                            {loan.installmentsPaid}/{loan.installments} payments
                          </span>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>${loan.paidAmount}/${loan.totalAmount}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{width: `${(loan.paidAmount / loan.totalAmount) * 100}%`}}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Remaining: ${loan.remainingAmount}
                          </span>
                          <span className="text-sm text-blue-600">
                            Next: ${loan.nextPaymentAmount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loans Tab */}
          {activeTab === 'loans' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">All Loans</h3>
                <Link 
                  href="/borrow"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply for New Loan
                </Link>
              </div>
              
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Merchant</div>
                        <div className="font-medium">{loan.merchant}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Amount</div>
                        <div className="font-medium">${loan.amount}</div>
                        <div className="text-sm text-gray-600">
                          {loan.installments} installments
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Status</div>
                        <span className={`inline-block px-2 py-1 rounded text-sm ${
                          loan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          loan.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Progress</div>
                        <div className="font-medium">
                          {loan.installmentsPaid}/{loan.installments}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{width: `${(loan.installmentsPaid / loan.installments) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {loan.status === 'active' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-gray-600">Next Payment: </span>
                            <span className="font-medium">${loan.nextPaymentAmount}</span>
                            <span className="text-sm text-gray-600"> due {loan.nextPaymentDate}</span>
                          </div>
                          <Transaction
                            chainId={baseSepolia.id}
                            calls={makePaymentCalls()}
                            isSponsored={true}
                          >
                            <TransactionButton 
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              text="Make Payment"
                            />
                            <TransactionStatus>
                              <TransactionStatusLabel />
                            </TransactionStatus>
                          </Transaction>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Payment History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late Fee
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[...upcomingPayments, ...paymentHistory].map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.paidDate || payment.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Loan #{payment.loanId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.lateFee ? `${payment.lateFee}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}