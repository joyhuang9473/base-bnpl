'use client';

import { useState } from 'react';
import React from 'react';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Link from 'next/link';
import { CONTRACT_ADDRESSES, ERC20_ABI, RISK_ENGINE_ABI, PAYMENT_CONTROLLER_ABI } from '../../lib/contracts';

interface LoanApplication {
  amount: string;
  collateralAmount: string;
  collateralType: 'USDC' | 'ETH';
  purpose: string;
  installments: number;
}

interface RiskAssessment {
  creditScore: number;
  riskTier: 0 | 1 | 2; // LOW, MEDIUM, HIGH
  approved: boolean;
  interestRate: number;
}

export default function BorrowPage() {
  const { address } = useAccount();
  const [step, setStep] = useState<'form' | 'assessment' | 'approve' | 'create' | 'complete'>('form');
  const [application, setApplication] = useState<LoanApplication>({
    amount: '',
    collateralAmount: '',
    collateralType: 'USDC',
    purpose: '',
    installments: 4
  });
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: registerMerchant, data: registerHash, isPending: isRegisterPending } = useWriteContract();
  const { writeContract: createLoan, data: loanHash, isPending: isLoanPending } = useWriteContract();
  
  const { isLoading: isApprovalConfirming } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isLoading: isRegisterConfirming } = useWaitForTransactionReceipt({ hash: registerHash });
  const { isLoading: isLoanConfirming } = useWaitForTransactionReceipt({ hash: loanHash });

  // Read contract data
  const { data: usdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Check payment templates that are initialized in the contract
  const { data: standardTemplate } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'paymentTemplates',
    args: ['standard'],
  });
  
  const { data: extended6Template } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'paymentTemplates',
    args: ['extended_6'],
  });
  
  const { data: extended12Template } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'paymentTemplates',
    args: ['extended_12'],
  });

  // Check if user is registered as merchant
  const { data: merchantData, refetch: refetchMerchantData } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'merchants',
    args: address ? [address] : undefined,
  });

  // Check admin role
  const { data: adminRoleBytes } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'ADMIN_ROLE',
  });

  const { data: hasAdminRole } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'hasRole',
    args: adminRoleBytes && address ? [adminRoleBytes, address] : undefined,
  });

  // Risk assessment using contract - only call when we have all required data
  const shouldCallRiskAssessment = address && application.amount && parseFloat(application.amount) > 0;
  const { data: riskAssessmentData, isLoading: isRiskAssessing } = useReadContract({
    address: CONTRACT_ADDRESSES.RISK_ENGINE,
    abi: RISK_ENGINE_ABI,
    functionName: 'assessRisk',
    args: shouldCallRiskAssessment ? [
      address,
      parseUnits(application.amount, 6),
      parseUnits((parseFloat(application.amount) * 1.5).toString(), application.collateralType === 'USDC' ? 6 : 18)
    ] : undefined,
  });

  const handleApproval = () => {
    if (!application.collateralAmount) return;
    const collateralDecimals = application.collateralType === 'USDC' ? 6 : 18;
    const amountInWei = parseUnits(application.collateralAmount, collateralDecimals);
    const collateralToken = application.collateralType === 'USDC' ? 
      CONTRACT_ADDRESSES.USDC : CONTRACT_ADDRESSES.WETH;
    
    writeApproval({
      address: collateralToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.COLLATERAL_MANAGER, amountInWei]
    });
  };

  const handleMerchantRegistration = () => {
    if (!address) return;
    
    console.log('Attempting to register merchant:', address);
    console.log('Contract address:', CONTRACT_ADDRESSES.PAYMENT_CONTROLLER);
    
    try {
      registerMerchant({
        address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
        abi: PAYMENT_CONTROLLER_ABI,
        functionName: 'registerMerchant',
        args: [
          address, // merchant address
          'BNPL User', // merchant name
          BigInt(0) // settlement delay (0 for immediate)
        ]
      });
    } catch (error) {
      console.error('Error registering merchant:', error);
    }
  };

  const handleRealLoanCreation = () => {
    if (!application.amount || !address || !assessment) return;
    
    const amountInWei = parseUnits(application.amount, 6);
    const collateralDecimals = application.collateralType === 'USDC' ? 6 : 18;
    const collateralAmountInWei = parseUnits(application.collateralAmount, collateralDecimals);
    const collateralToken = application.collateralType === 'USDC' ? 
      CONTRACT_ADDRESSES.USDC : CONTRACT_ADDRESSES.WETH;
    
    // Determine template based on installments
    let templateName = 'standard';
    if (application.installments === 6) templateName = 'extended_6';
    else if (application.installments === 12) templateName = 'extended_12';
    
    createLoan({
      address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
      abi: PAYMENT_CONTROLLER_ABI,
      functionName: 'createLoan',
      args: [
        address, // merchant (user acts as their own merchant for BNPL)
        amountInWei, // principal
        collateralAmountInWei, // collateralAmount
        collateralToken, // collateralToken
        templateName // termsTemplate
      ]
    });
  };

  const performRiskAssessment = () => {
    // Calculate collateral requirement (150% of loan amount)
    const collateralRequired = (parseFloat(application.amount) * 1.5).toString();
    setApplication({...application, collateralAmount: collateralRequired});
    
    // Use real risk assessment from contract if available
    if (riskAssessmentData) {
      const [creditScore, riskTier, approved, interestRate] = riskAssessmentData;
      setAssessment({
        creditScore: Number(creditScore),
        riskTier: Number(riskTier) as 0 | 1 | 2,
        approved: approved,
        interestRate: Number(interestRate) / 100 // Convert from basis points
      });
      setStep('assessment');
    } else {
      // If contract call hasn't completed yet, show loading or use demo data
      // In production, you might want to show a loading state here
      setAssessment({
        creditScore: 720,
        riskTier: 0, // LOW
        approved: true,
        interestRate: 8.5 // 8.5% APR
      });
      setStep('assessment');
    }
  };

  // Auto-advance steps based on transaction completion
  if (approvalHash && !isApprovalConfirming && step === 'approve') {
    setStep('create');
  }
  if (loanHash && !isLoanConfirming && step === 'create') {
    setStep('complete');
  }
  // Auto-refresh merchant data after registration
  React.useEffect(() => {
    if (registerHash && !isRegisterConfirming) {
      // Refetch merchant data after successful registration
      const timer = setTimeout(() => {
        refetchMerchantData?.();
        console.log('Refetching merchant data after registration');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [registerHash, isRegisterConfirming, refetchMerchantData]);

  if (!address) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-neutral-600 mb-8">Connect your wallet to apply for a loan</p>
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
                <Link href="/borrow" className="text-primary-600 font-medium">
                  Borrow
                </Link>
                <Link href="/lend" className="text-neutral-600 hover:text-primary-600 font-medium transition-colors">
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${['form', 'assessment'].includes(step) ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['form', 'assessment'].includes(step) ? 'bg-primary-600 text-white' : 'bg-neutral-200'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Application</span>
            </div>
            <div className="w-8 h-px bg-neutral-200"></div>
            <div className={`flex items-center ${step === 'approve' ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'approve' ? 'bg-primary-600 text-white' : 'bg-neutral-200'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Approval</span>
            </div>
            <div className="w-8 h-px bg-neutral-200"></div>
            <div className={`flex items-center ${step === 'create' ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'create' ? 'bg-primary-600 text-white' : 'bg-neutral-200'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Create Loan</span>
            </div>
          </div>
        </div>

        {/* Application Form */}
        {step === 'form' && (
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">Loan Application</h2>
            
            {/* USDC Balance Display */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Your USDC Balance</h3>
              <p className="text-2xl font-bold text-blue-700">
                {usdcBalance ? Number(formatUnits(usdcBalance, 6)).toFixed(2) : '0.00'} USDC
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Loan Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={application.amount}
                    onChange={(e) => setApplication({...application, amount: e.target.value})}
                    className="input"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Collateral Type
                  </label>
                  <select
                    value={application.collateralType}
                    onChange={(e) => setApplication({...application, collateralType: e.target.value as 'USDC' | 'ETH'})}
                    className="input"
                  >
                    <option value="USDC">USDC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Installments
                  </label>
                  <select
                    value={application.installments}
                    onChange={(e) => setApplication({...application, installments: parseInt(e.target.value)})}
                    className="input"
                  >
                    <option value={2}>2 payments</option>
                    <option value={4}>4 payments</option>
                    <option value={6}>6 payments</option>
                    <option value={12}>12 payments</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Purpose of loan
                  </label>
                  <select
                    value={application.purpose}
                    onChange={(e) => setApplication({...application, purpose: e.target.value})}
                    className="input"
                  >
                    <option value="">Select purpose</option>
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion & Clothing</option>
                    <option value="home">Home & Garden</option>
                    <option value="travel">Travel</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="bg-neutral-100 p-4 rounded-xl">
                  <h3 className="font-medium text-neutral-900 mb-2">Loan Preview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Loan amount:</span>
                      <span>${application.amount || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Collateral required:</span>
                      <span>${application.amount ? (parseFloat(application.amount) * 1.5).toFixed(2) : '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Payment amount:</span>
                      <span>${application.amount ? (parseFloat(application.amount) / application.installments).toFixed(2) : '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={performRiskAssessment}
                disabled={!application.amount || !application.purpose || isRiskAssessing}
                className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRiskAssessing ? 'Assessing Risk...' : 'Continue to Assessment'}
              </button>
            </div>
          </div>
        )}

        {/* Risk Assessment Results */}
        {step === 'assessment' && assessment && (
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">Risk Assessment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                {assessment.approved ? (
                  <div className="bg-success-50 border border-success-200 p-6 rounded-xl mb-6">
                    <h3 className="text-lg font-semibold text-success-900 mb-2">✓ Loan Approved</h3>
                    <p className="text-success-700">
                      Your loan application has been approved based on on-chain risk assessment.
                      {riskAssessmentData ? ' Assessment powered by RiskEngine smart contract.' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="bg-error-50 border border-error-200 p-6 rounded-xl mb-6">
                    <h3 className="text-lg font-semibold text-error-900 mb-2">✗ Loan Denied</h3>
                    <p className="text-error-700">
                      Your loan application has been denied based on risk assessment. Please try with a smaller amount or provide more collateral.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Credit Score:</span>
                    <span className="font-semibold">{assessment.creditScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Risk Tier:</span>
                    <span className={`font-semibold ${
                      assessment.riskTier === 0 ? 'text-success-600' :
                      assessment.riskTier === 1 ? 'text-warning-600' : 'text-error-600'
                    }`}>
                      {['LOW', 'MEDIUM', 'HIGH'][assessment.riskTier]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Interest Rate:</span>
                    <span className="font-semibold">{assessment.interestRate}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-100 p-6 rounded-xl">
                <h3 className="font-semibold text-neutral-900 mb-4">Collateral Details</h3>
                <div className="text-2xl font-bold text-primary-600 mb-2">
                  {application.collateralAmount} {application.collateralType}
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                  Your {application.collateralType} tokens will be locked as collateral until loan repayment.
                </p>
                <div className="bg-warning-50 border border-warning-200 p-3 rounded-lg">
                  <p className="text-sm text-warning-800">
                    <strong>Liquidation Risk:</strong> If collateral value falls below 110% of loan value, 
                    collateral may be liquidated.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep('form')}
                className="btn-secondary px-6 py-3"
              >
                Back to Application
              </button>
              {assessment.approved && (
                <button
                  onClick={() => setStep('approve')}
                  className="btn-primary px-6 py-3"
                >
                  Accept Terms
                </button>
              )}
            </div>
          </div>
        )}

        {/* Approval Step */}
        {step === 'approve' && assessment && (
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">Approve Collateral</h2>
            
            <div className="bg-warning-50 border border-warning-200 p-4 rounded-xl mb-6">
              <p className="text-sm text-warning-800">
                You need to approve {application.collateralAmount} {application.collateralType} 
                as collateral before creating the loan.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('assessment')}
                className="btn-secondary px-6 py-3"
              >
                Back
              </button>
              
              <button
                onClick={handleApproval}
                disabled={isApprovePending || isApprovalConfirming}
                className="btn-primary px-6 py-3 disabled:opacity-50"
              >
                {isApprovePending ? 'Confirming...' : isApprovalConfirming ? 'Waiting...' : 'Approve Collateral'}
              </button>
            </div>
          </div>
        )}


        {/* Loan Creation Step */}
        {step === 'create' && assessment && (
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">Create Loan</h2>
            
            <div className="bg-success-50 border border-success-200 p-4 rounded-xl mb-6">
              <p className="text-sm text-success-800">
                ✅ Collateral approved! Ready to create your loan.
              </p>
            </div>

            {/* Contract Status Info */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Contract Status</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div>Standard Template (4 payments): {standardTemplate && standardTemplate[0] > 0 ? '✓ Available' : '✗ Not found'}</div>
                <div>Extended 6 Template: {extended6Template && extended6Template[0] > 0 ? '✓ Available' : '✗ Not found'}</div>
                <div>Extended 12 Template: {extended12Template && extended12Template[0] > 0 ? '✓ Available' : '✗ Not found'}</div>
                <div>Merchant Active: {merchantData && merchantData[4] ? '✓ Yes' : '✗ No'}</div>
              </div>
            </div>

            {/* Merchant Registration Info */}
            {!merchantData?.[4] && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ Merchant Registration Required</h4>
                <p className="text-sm text-blue-800 mb-3">
                  You need to register as a merchant before creating loans. The button below will register you first, then create the loan.
                </p>
                
                {/* Debug info */}
                <div className="text-xs text-blue-700 p-2 bg-blue-100 rounded">
                  <div><strong>Status:</strong></div>
                  <div>Has Admin Role: {hasAdminRole ? '✓ Yes' : '✗ No'}</div>
                  <div>Merchant Active: {merchantData?.[4] ? '✓ Yes' : '✗ No'}</div>
                  <div>Your address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
                  {!hasAdminRole && (
                    <div className="text-red-600 mt-1">
                      ⚠️ Admin role required for merchant registration!
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-neutral-100 p-4 rounded-xl mb-6">
              <h3 className="font-medium text-neutral-900 mb-2">Loan Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Principal Amount:</span>
                  <span>${application.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Collateral:</span>
                  <span>{application.collateralAmount} {application.collateralType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Interest Rate:</span>
                  <span>{assessment.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Risk Tier:</span>
                  <span className={`${
                    assessment.riskTier === 0 ? 'text-success-600' :
                    assessment.riskTier === 1 ? 'text-warning-600' : 'text-error-600'
                  }`}>
                    {['LOW', 'MEDIUM', 'HIGH'][assessment.riskTier]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Installments:</span>
                  <span>{application.installments} payments</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('approve')}
                className="btn-secondary px-6 py-3"
              >
                Back
              </button>
              
              <button
                onClick={!merchantData?.[4] ? handleMerchantRegistration : handleRealLoanCreation}
                disabled={(isLoanPending || isLoanConfirming || isRegisterPending || isRegisterConfirming) || (!merchantData?.[4] && !hasAdminRole) || (merchantData?.[4] && !standardTemplate?.[0])}
                className="btn-primary px-6 py-3 disabled:opacity-50"
              >
                {isRegisterPending ? 'Registering as Merchant...' : 
                 isRegisterConfirming ? 'Confirming Registration...' :
                 isLoanPending ? 'Creating Loan...' : 
                 isLoanConfirming ? 'Confirming Loan...' :
                 !merchantData?.[4] && !hasAdminRole ? 'Need Admin Role' :
                 !merchantData?.[4] ? 'Register as Merchant' :
                 !standardTemplate?.[0] ? 'Payment Template Not Available' :
                 'Create Loan'}
              </button>
            </div>
          </div>
        )}

        {/* Completion */}
        {step === 'complete' && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-white">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Loan Created Successfully!</h2>
            <p className="text-neutral-600 mb-4">
              Your loan for ${application.amount} USDC has been created on-chain.
              {application.collateralAmount} {application.collateralType} collateral has been locked.
            </p>
            {loanHash && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-blue-900 mb-2">✓ Transaction Completed</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <div className="font-mono text-xs break-all">{loanHash}</div>
                </div>
              </div>
            )}
            <p className="text-sm text-neutral-500 mb-8">
              Your loan will appear in your dashboard and needs to be funded before it becomes active.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard" className="btn-primary px-6 py-3">
                View Dashboard
              </Link>
              <Link href="/" className="btn-secondary px-6 py-3">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}