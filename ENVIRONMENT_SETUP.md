# Environment Setup Guide

This guide will help you set up the Base BNPL application with proper API keys and environment configuration.

## Quick Setup

The application will work with default values, but for full functionality you'll need proper API keys.

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Get Coinbase Developer Platform Keys (Required for wallet functionality)

1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Sign up/login with your Coinbase account
3. Create a new project
4. Copy your API Key and Project ID
5. Add them to your `.env` file:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here
NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id_here
```

### 3. Optional: Get WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your Project ID
4. Add it to your `.env` file:

```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 4. Optional: Set up Sponsored Transactions

For gas-free transactions (sponsored by your paymaster):

```bash
NEXT_PUBLIC_PAYMASTER_ENDPOINT=https://api.developer.coinbase.com/rpc/v1/base-sepolia/YOUR_API_KEY
```

## Common Issues and Solutions

### Issue: "401 Unauthorized" API errors
**Solution**: Make sure you have valid API keys set in your `.env` file.

### Issue: WebSocket connection failures
**Solution**: This is normal for development and doesn't affect functionality. The app uses fallback methods.

### Issue: "indexedDB is not defined"
**Solution**: This is a development warning and doesn't affect the app in browsers.

### Issue: Wallet connection problems
**Solution**: Ensure you have:
- Valid `NEXT_PUBLIC_ONCHAINKIT_API_KEY`
- Valid `NEXT_PUBLIC_CDP_PROJECT_ID`
- Your wallet is connected to Base Sepolia testnet

## Development Mode

For development, you can run the app without API keys. It will use demo values:

```bash
npm run dev
```

The app will display loading states instead of live contract data, but all UI components will work.

## Testing with Real Contracts

To test with the deployed Base Sepolia contracts:

1. Ensure you have Base Sepolia ETH for gas fees
2. Get some USDC on Base Sepolia from a faucet
3. Connect your wallet to Base Sepolia network (Chain ID: 84532)
4. Use the deployed contract addresses (already configured):
   - USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - LendingPool: `0xD561C796Ca1cA80fB6559aae8bd511E18775152c`
   - PaymentController: `0x2cAA7aeD545bB865c5d4021e0Db6eb5243c5E563`
   - CollateralManager: `0xcE6CC3675E1336f3B6b142527a87FcFCe77C3473`

## Support

- Check [OnchainKit Documentation](https://onchainkit.xyz/) for wallet integration
- Visit [Base Developer Docs](https://docs.base.org/) for Base blockchain info
- See [Wagmi Documentation](https://wagmi.sh/) for React hooks