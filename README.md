# Base-BNPL: Buy Now, Pay Later on Base

A decentralized Buy Now, Pay Later (BNPL) protocol built on Base, enabling users to make purchases with installment payments while maintaining full control of their collateral.

## 🚀 Overview

Base-BNPL is a comprehensive DeFi lending protocol that combines traditional BNPL functionality with blockchain technology. Users can purchase goods and services from merchants using installment payments, with their crypto assets serving as collateral. The protocol features automated risk assessment, collateral management, and yield generation for lenders.

## ✨ Key Features

- **Zero-Interest Installments**: Most payment plans feature 0% interest for standard terms
- **Crypto Collateral**: Use any supported ERC-20 token as collateral
- **Automated Risk Assessment**: On-chain credit scoring based on wallet history and collateral
- **Liquidity Pool**: Earn yield by providing USDC to the lending pool
- **Merchant Integration**: Seamless merchant onboarding and settlement
- **Collateral Management**: Automated liquidation and recovery systems
- **Risk-Based Pricing**: Dynamic APY based on borrower risk tiers

## 🏗️ Architecture

The protocol consists of four main smart contracts working together:

### 1. **CollateralManager** (`CollateralManager.sol`)
- Manages collateral locking, valuation, and liquidation
- Supports multiple ERC-20 tokens as collateral
- Automated price feeds and liquidation thresholds
- Emergency withdrawal capabilities for admins

### 2. **LendingPool** (`LendingPool.sol`)
- Manages lender deposits and yield distribution
- Risk-tiered APY system (4% - 15% APY)
- Reserve fund for loss protection
- Utilization-based lending limits

### 3. **PaymentController** (`PaymentController.sol`)
- Handles loan creation and payment processing
- Automated payment scheduling and late fee calculation
- Merchant settlement and order management
- Default detection and liquidation triggers

### 4. **RiskEngine** (`RiskEngine.sol`)
- On-chain credit assessment and scoring (300-850 scale)
- Risk tier classification (LOW, MEDIUM, HIGH, DENIED)
- Payment history tracking and score adjustments
- Collateral ratio validation

## 🔧 Smart Contract Details

### Risk Tiers & Loan Limits
- **LOW Risk** (750+ credit score): Up to $10,000 loans, 4% APY
- **MEDIUM Risk** (600-749 credit score): Up to $5,000 loans, 8% APY  
- **HIGH Risk** (300-599 credit score): Up to $2,000 loans, 15% APY
- **DENIED**: Below 300 credit score

### Payment Plans
- **Standard**: 4 payments over 6 weeks, 0% interest
- **Extended 6**: 6 payments over 3 months, 3% total interest
- **Extended 12**: 12 payments over 6 months, 6% total interest

### Collateral Requirements
- Minimum collateral ratio: 110% of loan value
- Liquidation threshold: 110% of loan value
- Liquidation bonus: Up to 5% for liquidators

### Installation

1. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Fill in your private keys and RPC endpoints
```

### Frontend Setup

1. **Start development server**
```bash
npm run dev
```

## 📱 Usage

### For Consumers (Borrower)

1. **Connect Wallet**: Connect your Web3 wallet to the platform
2. **Select Merchant**: Choose from approved merchants
3. **Choose Payment Plan**: Select installment terms (4, 6, or 12 payments)
4. **Provide Collateral**: Lock supported ERC-20 tokens as collateral
5. **Complete Purchase**: Receive goods/services immediately
6. **Make Payments**: Pay installments according to schedule

### For Investors (Lender)

1. **Deposit USDC**: Add USDC to the lending pool
2. **Choose Risk Tier**: Select preferred risk allocation
3. **Earn Yield**: Receive APY based on risk tier (4% - 15%)
4. **Withdraw**: Remove funds at any time (subject to liquidity)

### For Retailers

1. **Register**: Submit merchant application
2. **Integration**: Integrate BNPL checkout into your platform
3. **Receive Payments**: Get immediate settlement in USDC
4. **Track Orders**: Monitor loan status and payments

## 🔒 Security Features

- **Reentrancy Protection**: All external calls protected
- **Access Control**: Role-based permissions for admin functions
- **Pausable**: Emergency pause functionality
- **Collateral Locking**: Secure collateral management
- **Liquidation Protection**: Automated default handling
- **Reserve Fund**: Loss protection for lenders

## 📊 Contract Addresses

### Base Sepolia Testnet
- **CollateralManager**: `0xcE6CC3675E1336f3B6b142527a87FcFCe77C3473`
- **LendingPool**: `0xD561C796Ca1cA80fB6559aae8bd511E18775152c`
- **PaymentController**: `0x2cAA7aeD545bB865c5d4021e0Db6eb5243c5E563`
- **RiskEngine**: `0x35360683CB8A466086C4fc03f2d3Bcf8b53eBBb2`

## 📈 Roadmap

### Phase 1: Core Protocol ✅
- [x] Smart contract development
- [x] Basic frontend interface
- [ ] Testing and security audits

### Phase 2: Enhanced Features 🚧
- [ ] Advanced risk modeling
- [ ] Cross-chain collateral support
- [ ] Mobile app development
- [ ] Merchant dashboard

### Phase 3: Ecosystem Expansion 📋
- [ ] DeFi protocol integrations
- [ ] NFT collateral support
- [ ] DAO governance
- [ ] Multi-chain deployment

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should conduct their own research and due diligence before using the protocol. Cryptocurrency investments carry significant risk.

---

**Built with ❤️ on Base**
