'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESSES, LENDING_POOL_ABI, PAYMENT_CONTROLLER_ABI } from '../lib/contracts';

// Hook to read lending pool statistics
export function usePoolStats() {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getPoolStats',
    query: {
      retry: false,
      enabled: !!CONTRACT_ADDRESSES.LENDING_POOL
    }
  });

  // Always return the same structure, whether data is available or not
  const defaultStats = {
    totalLiquidity: BigInt(0),
    totalLoaned: BigInt(0),
    totalYieldPaid: BigInt(0),
    totalDefaulted: BigInt(0),
    utilizationRate: BigInt(0),
    averageAPY: BigInt(0),
    totalLenders: BigInt(0),
    totalBorrowers: BigInt(0),
    isLoading,
    isError
  };

  if (!isLoading && !isError && data && Array.isArray(data)) {
    return {
      totalLiquidity: data[0] || BigInt(0),
      totalLoaned: data[1] || BigInt(0),
      totalYieldPaid: data[2] || BigInt(0),
      totalDefaulted: data[3] || BigInt(0),
      utilizationRate: data[4] || BigInt(0),
      averageAPY: data[5] || BigInt(0),
      totalLenders: data[6] || BigInt(0),
      totalBorrowers: data[7] || BigInt(0),
      isLoading,
      isError
    };
  }

  return defaultStats;
}

// Hook to read user's lending position
export function useLenderPosition(address?: string) {
  const { data, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: 'getLenderPosition',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.LENDING_POOL,
      retry: false
    }
  });

  // Always return the same structure
  const defaultPosition = {
    deposited: BigInt(0),
    yieldEarned: BigInt(0),
    lastUpdateTime: BigInt(0),
    riskTier: 0,
    autoReinvest: false,
    isLoading,
    isError
  };

  if (!isLoading && !isError && data && Array.isArray(data)) {
    return {
      deposited: data[0] || BigInt(0),
      yieldEarned: data[1] || BigInt(0),
      lastUpdateTime: data[2] || BigInt(0),
      riskTier: data[3] || 0,
      autoReinvest: data[4] || false,
      isLoading,
      isError
    };
  }

  return defaultPosition;
}

// Hook to read user's loans
export function useBorrowerLoans(address?: string) {
  const { data: loanIds, isError: loanIdsError, isLoading: loanIdsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
    abi: PAYMENT_CONTROLLER_ABI,
    functionName: 'borrowerLoans',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
      retry: false
    }
  });

  // If user has loans, read the loan details
  const loanContracts = Array.isArray(loanIds) && loanIds.length > 0 
    ? loanIds.slice(0, 10).map((loanId: bigint) => ({
        address: CONTRACT_ADDRESSES.PAYMENT_CONTROLLER,
        abi: PAYMENT_CONTROLLER_ABI,
        functionName: 'loans',
        args: [loanId]
      }))
    : [];

  const { data: loansData, isError: loansError, isLoading: loansLoading } = useReadContracts({
    contracts: loanContracts,
    query: {
      enabled: loanContracts.length > 0,
      retry: false
    }
  });

  const loans = loansData?.map((result: any, index) => {
    if (result?.status === 'success' && result?.result && Array.isArray(result.result)) {
      const data = result.result;
      return {
        id: Number(data[0] || 0),
        borrower: data[1] || '',
        merchant: data[2] || '',
        principal: data[3] || BigInt(0),
        totalAmount: data[4] || BigInt(0),
        collateralAmount: data[5] || BigInt(0),
        collateralToken: data[6] || '',
        status: Number(data[7] || 0),
        createdAt: Number(data[8] || 0),
        nextPaymentDue: Number(data[9] || 0),
        paidAmount: data[10] || BigInt(0),
        remainingAmount: data[11] || BigInt(0),
        riskTier: Number(data[12] || 0)
      };
    }
    return null;
  }).filter(Boolean) || [];

  return {
    loanIds: Array.isArray(loanIds) ? loanIds : [],
    loans,
    isLoading: loanIdsLoading || loansLoading,
    isError: loanIdsError || loansError
  };
}

// Convert wei amounts to readable numbers
export function formatTokenAmount(amount: bigint, decimals = 6): string {
  try {
    if (!amount || amount === BigInt(0)) return '0';
    
    const divisor = BigInt(10 ** decimals);
    const quotient = amount / divisor;
    const remainder = amount % divisor;
    
    if (remainder === BigInt(0)) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    if (trimmedRemainder === '') {
      return quotient.toString();
    }
    
    return `${quotient}.${trimmedRemainder}`;
  } catch (error) {
    console.warn('Error formatting token amount:', error);
    return '0';
  }
}

// Convert basis points to percentage
export function formatBasisPoints(basisPoints: bigint): string {
  try {
    if (!basisPoints || basisPoints === BigInt(0)) return '0.00';
    
    const percentage = Number(basisPoints) / 100;
    return percentage.toFixed(2);
  } catch (error) {
    console.warn('Error formatting basis points:', error);
    return '0.00';
  }
}