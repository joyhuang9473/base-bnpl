// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILendingPool
 * @dev Interface for the Base-BNPL lending pool contract
 */
interface ILendingPool {
    enum RiskTier {
        LOW,
        MEDIUM,
        HIGH
    }

    struct LenderPosition {
        uint256 deposited;
        uint256 yieldEarned;
        uint256 lastUpdateTime;
        RiskTier riskTier;
        bool autoReinvest;
    }

    struct PoolStats {
        uint256 totalLiquidity;
        uint256 totalLoaned;
        uint256 totalYieldPaid;
        uint256 totalDefaulted;
        uint256 utilizationRate;
        uint256 averageAPY;
        uint256 totalLenders;
        uint256 totalBorrowers;
    }

    // Events
    event Deposited(address indexed lender, uint256 amount, RiskTier tier);
    event Withdrawn(address indexed lender, uint256 amount);
    event YieldDistributed(address indexed lender, uint256 amount);
    event LoanFunded(uint256 indexed loanId, address indexed borrower, uint256 amount, RiskTier tier);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event DefaultHandled(uint256 indexed loanId, uint256 lossAmount);
    event APYUpdated(RiskTier tier, uint256 newAPY);

    // Core Functions
    function deposit(uint256 amount, RiskTier riskTier) external;
    function withdraw(uint256 amount) external;
    function claimYield() external;
    
    // Loan Management (called by PaymentController)
    function fundLoan(
        uint256 loanId,
        address borrower,
        uint256 amount,
        RiskTier riskTier
    ) external;
    
    function repayLoan(
        uint256 loanId,
        uint256 amount,
        RiskTier riskTier
    ) external;
    
    function handleDefault(
        uint256 loanId,
        uint256 lossAmount,
        uint256 recoveredAmount
    ) external;

    // View Functions
    function getLenderPosition(address lender) external view returns (LenderPosition memory);
    function getPoolStats() external view returns (PoolStats memory);
    function getAvailableLiquidity() external view returns (uint256);
    function tierAPY(RiskTier tier) external view returns (uint256);
    function tierLiquidity(RiskTier tier) external view returns (uint256);
    function reserveFund() external view returns (uint256);

    // Admin Functions
    function updateTierAPY(RiskTier tier, uint256 newAPY) external;
    function pause() external;
    function unpause() external;
}