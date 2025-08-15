# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Base-BNPL is a decentralized Buy Now Pay Later (BNPL) platform built on the Base blockchain. It consists of a Next.js frontend application and Hardhat-based smart contracts that enable collateral-backed lending with risk assessment and automated payment processing.

## Architecture

### Frontend (Next.js + OnchainKit)
- **Framework**: Next.js 15.3.3 with TypeScript
- **Blockchain Integration**: Wagmi + OnchainKit for wallet connectivity and contract interactions
- **Styling**: Tailwind CSS with custom configuration
- **Key Components**:
  - `app/providers.tsx`: Configures OnchainKit, Wagmi, and React Query providers
  - `wagmi.ts`: Wallet configuration for Base and Base Sepolia networks
  - `types/index.ts`: Comprehensive TypeScript definitions for all protocol entities

### Smart Contracts (Hardhat + Solidity)
- **Framework**: Hardhat with OpenZeppelin contracts
- **Solidity Version**: 0.8.20 with optimizer enabled
- **Core Contracts**:
  - `LendingPool.sol`: Central liquidity pool with risk-tiered yield management
  - `RiskEngine.sol`: Credit scoring and risk assessment engine
  - `PaymentController.sol`: Automated payment processing and scheduling
  - `CollateralManager.sol`: Collateral management and liquidation logic
  - `SharedTypes.sol`: Common enums and type definitions across contracts

### Type System
The project uses a comprehensive TypeScript type system defined in `types/index.ts` covering:
- Core protocol types (Loan, Payment, PaymentTerms, LoanStatus)
- Risk assessment types (RiskTier, RiskAssessment, ApprovalStatus) 
- User types (UserProfile, UserType, KYCLevel)
- Frontend state management types
- Contract interaction types
- Form validation types

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Next.js development server
npm run build        # Build production version
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Smart Contract Development
```bash
cd contracts
npm run compile      # Compile smart contracts
npm run test         # Run contract tests
npm run node         # Start local Hardhat network
npm run clean        # Clean build artifacts
```

### Deployment
```bash
cd contracts
npm run deploy:baseSepolia    # Deploy to Base Sepolia testnet
npm run deploy:base          # Deploy to Base mainnet
npm run verify:baseSepolia   # Verify contracts on Base Sepolia
npm run verify:base         # Verify contracts on Base mainnet
```

## Network Configuration

The project supports Base and Base Sepolia networks:
- **Base Sepolia**: Testnet (Chain ID: 84532)
- **Base Mainnet**: Production (Chain ID: 8453)

## Environment Setup

Copy `.env.example` to `.env` and configure the following variables:

### Required for Basic Functionality:
```bash
# Get these from https://portal.cdp.coinbase.com/
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_api_key_here
NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id_here

# Optional: Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Optional for Enhanced Features:
```bash
# For sponsored transactions
NEXT_PUBLIC_PAYMASTER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base-sepolia/YOUR_API_KEY

# For contract verification
BASESCAN_API_KEY=your_basescan_api_key

# For development/deployment
PRIVATE_KEY=your_private_key_for_deployment
```

### Setup Instructions:
1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project and get your API key and project ID
3. (Optional) Get WalletConnect project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)
4. The app will work with demo values if API keys are not provided, but wallet functionality will be limited

## Deployed Contracts (Base Sepolia)

The following contracts are deployed and integrated:
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **WETH Token**: `0x4200000000000000000000000000000000000006`
- **LendingPool**: `0xD561C796Ca1cA80fB6559aae8bd511E18775152c`
- **RiskEngine**: `0x35360683CB8A466086C4fc03f2d3Bcf8b53eBBb2`
- **PaymentController**: `0x2cAA7aeD545bB865c5d4021e0Db6eb5243c5E563`
- **CollateralManager**: `0xcE6CC3675E1336f3B6b142527a87FcFCe77C3473`

Contract addresses and ABIs are configured in `lib/contracts.ts`.

## Key Patterns

### Risk-Based Architecture
The protocol uses a tiered risk system:
- **LOW** (750+ credit score): Lowest interest, highest liquidity access
- **MEDIUM** (600-749): Standard terms with moderate collateral requirements
- **HIGH** (300-599): Higher interest, increased collateral requirements
- **DENIED** (<300): Applications rejected

### Smart Contract Integration
- Contracts use OpenZeppelin standards for security (ReentrancyGuard, AccessControl, Pausable)
- Shared enums via `SharedTypes.sol` ensure consistency across contracts
- Role-based access control for administrative functions

### Frontend State Management
- Wagmi for blockchain state and contract interactions
- React Query for async state management and caching
- OnchainKit for standardized wallet connectivity and transaction flows
- Viem for contract interaction encoding/decoding

### UI Design System
- **Color Palette**: Coinbase/Base inspired blues and neutrals
- **Components**: Custom utility classes (btn-primary, btn-secondary, card, input)
- **Typography**: Inter font family for professional appearance
- **Theme**: Minimalistic design with proper contrast and accessibility

## Testing

Smart contracts use Hardhat's testing framework with:
- Chai matchers for assertions
- Network helpers for blockchain state manipulation  
- OpenZeppelin test utilities for contract upgrades

No frontend tests are currently configured - when adding tests, use the existing Next.js test setup patterns.

## Contract Integration

All pages now use real contract interactions:
- **Borrow Page**: Creates loans through LendingPool contract with collateral approval
- **Lend Page**: Deposits USDC into lending pools with risk tier selection
- **Dashboard**: Displays real loan data and enables payment processing
- **Transactions**: All interactions use OnchainKit's Transaction components with sponsored gas

## Mock Data Removal

All mock data has been replaced with contract integration:
- Risk assessment calls RiskEngine contract
- Loan creation uses LendingPool.createLoan()
- Payments processed through PaymentController
- Portfolio data fetched from user's lending positions