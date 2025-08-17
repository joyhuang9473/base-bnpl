// Contract addresses and configurations for Base Sepolia
export const CONTRACT_ADDRESSES = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
  WETH: '0x4200000000000000000000000000000000000006' as const,
  COLLATERAL_MANAGER: '0xcE6CC3675E1336f3B6b142527a87FcFCe77C3473' as const,
  RISK_ENGINE: '0x35360683CB8A466086C4fc03f2d3Bcf8b53eBBb2' as const,
  LENDING_POOL: '0xD561C796Ca1cA80fB6559aae8bd511E18775152c' as const,
  PAYMENT_CONTROLLER: '0x2cAA7aeD545bB865c5d4021e0Db6eb5243c5E563' as const,
} as const;

// Basic contract ABIs - In production, these would be imported from contract artifacts
export const LENDING_POOL_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint8", "name": "riskTier", "type": "uint8"}
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint8", "name": "riskTier", "type": "uint8"}
    ],
    "name": "fundLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolStats",
    "outputs": [
      {"internalType": "uint256", "name": "totalLiquidity", "type": "uint256"},
      {"internalType": "uint256", "name": "totalLoaned", "type": "uint256"},
      {"internalType": "uint256", "name": "totalYieldPaid", "type": "uint256"},
      {"internalType": "uint256", "name": "totalDefaulted", "type": "uint256"},
      {"internalType": "uint256", "name": "utilizationRate", "type": "uint256"},
      {"internalType": "uint256", "name": "averageAPY", "type": "uint256"},
      {"internalType": "uint256", "name": "totalLenders", "type": "uint256"},
      {"internalType": "uint256", "name": "totalBorrowers", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getLenderPosition",
    "outputs": [
      {"internalType": "uint256", "name": "deposited", "type": "uint256"},
      {"internalType": "uint256", "name": "yieldEarned", "type": "uint256"},
      {"internalType": "uint256", "name": "lastUpdateTime", "type": "uint256"},
      {"internalType": "uint8", "name": "riskTier", "type": "uint8"},
      {"internalType": "bool", "name": "autoReinvest", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const RISK_ENGINE_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"}
    ],
    "name": "assessRisk",
    "outputs": [
      {"internalType": "uint256", "name": "creditScore", "type": "uint256"},
      {"internalType": "uint8", "name": "riskTier", "type": "uint8"},
      {"internalType": "bool", "name": "approved", "type": "bool"},
      {"internalType": "uint256", "name": "interestRate", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const PAYMENT_CONTROLLER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
      {"internalType": "address", "name": "collateralToken", "type": "address"},
      {"internalType": "string", "name": "termsTemplate", "type": "string"}
    ],
    "name": "createLoan",
    "outputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"}
    ],
    "name": "isMerchantRegistered",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "templateName", "type": "string"}
    ],
    "name": "paymentTemplates",
    "outputs": [
      {"internalType": "uint256", "name": "installments", "type": "uint256"},
      {"internalType": "uint256", "name": "intervalDays", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRate", "type": "uint256"},
      {"internalType": "uint256", "name": "lateFeeRate", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"}
    ],
    "name": "merchants",
    "outputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "wallet", "type": "address"},
      {"internalType": "uint256", "name": "totalVolume", "type": "uint256"},
      {"internalType": "uint256", "name": "totalOrders", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "uint256", "name": "settlementDelay", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "settlementDelay", "type": "uint256"}
    ],
    "name": "registerMerchant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "templateName", "type": "string"},
      {"internalType": "uint256", "name": "installments", "type": "uint256"},
      {"internalType": "uint256", "name": "interestRate", "type": "uint256"},
      {"internalType": "uint256", "name": "installmentPeriod", "type": "uint256"}
    ],
    "name": "createPaymentTemplate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "name": "fundLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "paymentId", "type": "uint256"}],
    "name": "makePayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "name": "loans",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
      {"internalType": "address", "name": "collateralToken", "type": "address"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "nextPaymentDue", "type": "uint256"},
      {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "remainingAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "riskTier", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "borrower", "type": "address"}],
    "name": "borrowerLoans",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "role", "type": "bytes32"},
      {"internalType": "address", "name": "account", "type": "address"}
    ],
    "name": "hasRole",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ADMIN_ROLE",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Helper function to encode contract calls (deprecated - using viem's encodeFunctionData directly)
// These functions are kept for backward compatibility but are no longer used
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function encodeLendingPoolDeposit(amount: bigint, riskTier: number) {
  // This would use viem's encodeFunctionData in practice
  return '0x' + '00'.repeat(32); // Placeholder
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function encodeLoanCreation(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  amount: bigint, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  collateralToken: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  collateralAmount: bigint, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  installments: number
) {
  // This would use viem's encodeFunctionData in practice
  return '0x' + '00'.repeat(32); // Placeholder
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function encodePayment(loanId: bigint) {
  // This would use viem's encodeFunctionData in practice
  return '0x' + '00'.repeat(32); // Placeholder
}

// Contract interaction helpers
export const CONTRACT_CONFIG = {
  lendingPool: {
    address: CONTRACT_ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI
  },
  riskEngine: {
    address: CONTRACT_ADDRESSES.RISK_ENGINE,
    abi: RISK_ENGINE_ABI
  },
  paymentController: {
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI
  },
  usdc: {
    address: CONTRACT_ADDRESSES.USDC,
    abi: ERC20_ABI
  }
} as const;

// Risk tier mapping
export const RISK_TIERS = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  DENIED: 3
} as const;

export const RISK_TIER_NAMES = {
  0: 'LOW',
  1: 'MEDIUM', 
  2: 'HIGH',
  3: 'DENIED'
} as const;