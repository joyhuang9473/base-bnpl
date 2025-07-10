// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../SharedTypes.sol";

/**
 * @title IRiskEngine
 * @dev Interface for the Base-BNPL risk assessment engine
 */
interface IRiskEngine {
    struct CreditProfile {
        uint256 creditScore;
        uint256 totalBorrowed;
        uint256 totalRepaid;
        uint256 successfulPayments;
        uint256 missedPayments;
        uint256 currentDebt;
        uint256 walletAge;
        uint256 lastAssessment;
        bool hasDefaulted;
        SharedTypes.RiskTier currentTier;
    }

    struct AssessmentResult {
        uint256 creditScore;
        SharedTypes.RiskTier riskTier;
        uint256 maxLoanAmount;
        uint256 requiredCollateral;
        bool approved;
        string reason;
    }

    struct RiskParameters {
        uint256 baseScore;
        uint256 maxOnchainBonus;
        uint256 maxCollateralBonus;
        uint256 maxWalletAgeBonus;
        uint256 missedPaymentPenalty;
        uint256 defaultPenalty;
        uint256 minCollateralRatio;
        uint256 liquidationThreshold;
    }

    // Events
    event CreditAssessed(
        address indexed user,
        uint256 creditScore,
        SharedTypes.RiskTier riskTier,
        uint256 maxLoanAmount
    );
    event CreditScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore);
    event PaymentRecorded(address indexed user, uint256 amount, bool onTime);
    event DefaultRecorded(address indexed user, uint256 amount);
    event RiskParametersUpdated();

    // Core Functions
    function assessRisk(
        address borrower,
        uint256 requestedAmount,
        uint256 collateralAmount,
        uint256 collateralValue
    ) external view returns (AssessmentResult memory);

    function recordPayment(
        address borrower,
        uint256 amount,
        bool onTime
    ) external;

    function recordLoan(
        address borrower,
        uint256 amount
    ) external;

    function recordLoanCompletion(
        address borrower,
        uint256 amount
    ) external;

    function recordDefault(
        address borrower,
        uint256 amount
    ) external;

    // View Functions
    function getCreditProfile(address user) external view returns (CreditProfile memory);
    function riskParams() external view returns (RiskParameters memory);
    function tierMaxAmounts(SharedTypes.RiskTier tier) external view returns (uint256);
    function tierMinScores(SharedTypes.RiskTier tier) external view returns (uint256);

    // Admin Functions
    function updateRiskParameters(RiskParameters calldata newParams) external;
    function updateTierConfig(
        SharedTypes.RiskTier tier,
        uint256 minScore,
        uint256 maxAmount
    ) external;
    function pause() external;
    function unpause() external;
}