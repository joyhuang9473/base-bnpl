// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ILendingPool.sol";

/**
 * @title RiskEngine
 * @dev On-chain credit assessment and risk management for Base-BNPL
 * Calculates credit scores based on wallet history, collateral, and other factors
 */
contract RiskEngine is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_ASSESSOR_ROLE = keccak256("RISK_ASSESSOR_ROLE");
    bytes32 public constant PAYMENT_CONTROLLER_ROLE = keccak256("PAYMENT_CONTROLLER_ROLE");

    struct CreditProfile {
        uint256 creditScore;          // 300-850 scale
        uint256 totalBorrowed;        // Total amount ever borrowed
        uint256 totalRepaid;          // Total amount repaid
        uint256 successfulPayments;   // Number of successful payments
        uint256 missedPayments;       // Number of missed payments
        uint256 currentDebt;          // Current outstanding debt
        uint256 walletAge;            // Age of wallet in days
        uint256 lastAssessment;       // Timestamp of last assessment
        bool hasDefaulted;            // Has ever defaulted
        RiskTier currentTier;         // Current risk tier
    }

    struct RiskParameters {
        uint256 baseScore;            // Base credit score (500)
        uint256 maxOnchainBonus;      // Max bonus from on-chain history (200)
        uint256 maxCollateralBonus;   // Max bonus from collateral (175)
        uint256 maxWalletAgeBonus;    // Max bonus from wallet age (125)
        uint256 missedPaymentPenalty; // Penalty per missed payment (50)
        uint256 defaultPenalty;       // Penalty for default (200)
        uint256 minCollateralRatio;   // Minimum collateral ratio (110%)
        uint256 liquidationThreshold; // Liquidation threshold (110%)
    }

    struct AssessmentResult {
        uint256 creditScore;
        RiskTier riskTier;
        uint256 maxLoanAmount;
        uint256 requiredCollateral;
        bool approved;
        string reason;
    }

    enum RiskTier {
        LOW,     // 750+ score, 4-6% APY
        MEDIUM,  // 600-749 score, 8-12% APY
        HIGH,    // 300-599 score, 15-25% APY
        DENIED   // Below 300 or other rejection criteria
    }

    // State variables
    ILendingPool public lendingPool;
    RiskParameters public riskParams;
    
    mapping(address => CreditProfile) public creditProfiles;
    mapping(RiskTier => uint256) public tierMaxAmounts;
    mapping(RiskTier => uint256) public tierMinScores;
    
    uint256 public constant SCORE_SCALE = 850;
    uint256 public constant MIN_SCORE = 300;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;

    // Events
    event CreditAssessed(
        address indexed user,
        uint256 creditScore,
        RiskTier riskTier,
        uint256 maxLoanAmount
    );
    event CreditScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore);
    event PaymentRecorded(address indexed user, uint256 amount, bool onTime);
    event DefaultRecorded(address indexed user, uint256 amount);
    event RiskParametersUpdated();

    constructor(address _lendingPool) {
        require(_lendingPool != address(0), "RiskEngine: Invalid LendingPool address");
        
        lendingPool = ILendingPool(_lendingPool);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize risk parameters
        riskParams = RiskParameters({
            baseScore: 500,
            maxOnchainBonus: 200,
            maxCollateralBonus: 175,
            maxWalletAgeBonus: 125,
            missedPaymentPenalty: 50,
            defaultPenalty: 200,
            minCollateralRatio: 11000, // 110% in basis points
            liquidationThreshold: 11000 // 110% in basis points
        });
        
        // Initialize tier configurations
        tierMinScores[RiskTier.LOW] = 750;
        tierMinScores[RiskTier.MEDIUM] = 600;
        tierMinScores[RiskTier.HIGH] = 300;
        tierMinScores[RiskTier.DENIED] = 0;
        
        // Maximum loan amounts per tier (in USDC, 6 decimals)
        tierMaxAmounts[RiskTier.LOW] = 10000 * 1e6;     // $10,000
        tierMaxAmounts[RiskTier.MEDIUM] = 5000 * 1e6;   // $5,000
        tierMaxAmounts[RiskTier.HIGH] = 2000 * 1e6;     // $2,000
        tierMaxAmounts[RiskTier.DENIED] = 0;
    }

    /**
     * @dev Assess credit risk for a borrower
     * @param borrower The borrower's address
     * @param requestedAmount The requested loan amount
     * @param collateralAmount The collateral amount provided
     * @param collateralValue The USD value of collateral
     * @return result Assessment result struct
     */
    function assessRisk(
        address borrower,
        uint256 requestedAmount,
        uint256 collateralAmount,
        uint256 collateralValue
    ) external view returns (AssessmentResult memory result) {
        require(borrower != address(0), "RiskEngine: Invalid borrower address");
        require(requestedAmount > 0, "RiskEngine: Invalid loan amount");
        require(collateralAmount > 0, "RiskEngine: Invalid collateral amount");
        
        // Calculate credit score
        uint256 creditScore = _calculateCreditScore(borrower, collateralValue, requestedAmount);
        
        // Determine risk tier
        RiskTier riskTier = _getRiskTier(creditScore);
        
        // Check if loan is approvable
        bool approved = true;
        string memory reason = "";
        
        // Check credit score threshold
        if (creditScore < tierMinScores[RiskTier.HIGH]) {
            approved = false;
            reason = "Credit score too low";
            riskTier = RiskTier.DENIED;
        }
        
        // Check loan amount limits
        if (requestedAmount > tierMaxAmounts[riskTier]) {
            approved = false;
            reason = "Requested amount exceeds tier limit";
        }
        
        // Check collateral ratio
        uint256 collateralRatio = (collateralValue * BASIS_POINTS) / requestedAmount;
        if (collateralRatio < riskParams.minCollateralRatio) {
            approved = false;
            reason = "Insufficient collateral";
        }
        
        // Check existing debt
        CreditProfile memory profile = creditProfiles[borrower];
        if (profile.currentDebt > 0) {
            approved = false;
            reason = "Existing debt outstanding";
        }
        
        // Calculate required collateral
        uint256 requiredCollateral = (requestedAmount * riskParams.minCollateralRatio) / BASIS_POINTS;
        
        result = AssessmentResult({
            creditScore: creditScore,
            riskTier: riskTier,
            maxLoanAmount: tierMaxAmounts[riskTier],
            requiredCollateral: requiredCollateral,
            approved: approved,
            reason: reason
        });
    }

    /**
     * @dev Record a successful payment
     * @param borrower The borrower's address
     * @param amount The payment amount
     * @param onTime Whether the payment was made on time
     */
    function recordPayment(
        address borrower,
        uint256 amount,
        bool onTime
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) {
        require(borrower != address(0), "RiskEngine: Invalid borrower address");
        require(amount > 0, "RiskEngine: Invalid payment amount");
        
        CreditProfile storage profile = creditProfiles[borrower];
        
        // Update payment history
        profile.totalRepaid += amount;
        
        if (onTime) {
            profile.successfulPayments++;
            // Boost credit score for on-time payment
            _updateCreditScore(borrower, 5, true);
        } else {
            profile.missedPayments++;
            // Penalize credit score for late payment
            _updateCreditScore(borrower, riskParams.missedPaymentPenalty, false);
        }
        
        profile.lastAssessment = block.timestamp;
        
        emit PaymentRecorded(borrower, amount, onTime);
    }

    /**
     * @dev Record a loan creation
     * @param borrower The borrower's address
     * @param amount The loan amount
     */
    function recordLoan(
        address borrower,
        uint256 amount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) {
        require(borrower != address(0), "RiskEngine: Invalid borrower address");
        require(amount > 0, "RiskEngine: Invalid loan amount");
        
        CreditProfile storage profile = creditProfiles[borrower];
        
        profile.totalBorrowed += amount;
        profile.currentDebt += amount;
        profile.lastAssessment = block.timestamp;
        
        // If this is the first loan, initialize wallet age
        if (profile.walletAge == 0) {
            profile.walletAge = _getWalletAge(borrower);
        }
    }

    /**
     * @dev Record loan repayment completion
     * @param borrower The borrower's address
     * @param amount The repaid amount
     */
    function recordLoanCompletion(
        address borrower,
        uint256 amount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) {
        require(borrower != address(0), "RiskEngine: Invalid borrower address");
        
        CreditProfile storage profile = creditProfiles[borrower];
        
        if (profile.currentDebt >= amount) {
            profile.currentDebt -= amount;
        } else {
            profile.currentDebt = 0;
        }
        
        // Boost credit score for loan completion
        _updateCreditScore(borrower, 25, true);
        
        profile.lastAssessment = block.timestamp;
    }

    /**
     * @dev Record a default
     * @param borrower The borrower's address
     * @param amount The defaulted amount
     */
    function recordDefault(
        address borrower,
        uint256 amount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) {
        require(borrower != address(0), "RiskEngine: Invalid borrower address");
        require(amount > 0, "RiskEngine: Invalid default amount");
        
        CreditProfile storage profile = creditProfiles[borrower];
        
        profile.hasDefaulted = true;
        profile.currentDebt = 0; // Debt is written off after default
        
        // Severe credit score penalty for default
        _updateCreditScore(borrower, riskParams.defaultPenalty, false);
        
        profile.lastAssessment = block.timestamp;
        
        emit DefaultRecorded(borrower, amount);
    }

    /**
     * @dev Get credit profile for a user
     * @param user The user's address
     * @return profile The credit profile
     */
    function getCreditProfile(address user) 
        external 
        view 
        returns (CreditProfile memory profile) 
    {
        profile = creditProfiles[user];
        
        // Update credit score if profile exists
        if (profile.lastAssessment > 0) {
            profile.creditScore = _calculateCreditScore(user, 0, 0);
            profile.currentTier = _getRiskTier(profile.creditScore);
        }
    }

    /**
     * @dev Update risk parameters
     * @param newParams New risk parameters
     */
    function updateRiskParameters(RiskParameters calldata newParams) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newParams.baseScore >= MIN_SCORE, "RiskEngine: Invalid base score");
        require(newParams.minCollateralRatio >= BASIS_POINTS, "RiskEngine: Invalid collateral ratio");
        
        riskParams = newParams;
        emit RiskParametersUpdated();
    }

    /**
     * @dev Update tier configurations
     * @param tier The risk tier
     * @param minScore Minimum score for tier
     * @param maxAmount Maximum loan amount for tier
     */
    function updateTierConfig(
        RiskTier tier,
        uint256 minScore,
        uint256 maxAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(minScore >= MIN_SCORE && minScore <= SCORE_SCALE, "RiskEngine: Invalid score");
        
        tierMinScores[tier] = minScore;
        tierMaxAmounts[tier] = maxAmount;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Internal functions

    /**
     * @dev Calculate credit score based on various factors
     * @param user The user's address
     * @param collateralValue The collateral value (0 if not assessing new loan)
     * @param loanAmount The loan amount (0 if not assessing new loan)
     * @return creditScore The calculated credit score
     */
    function _calculateCreditScore(
        address user,
        uint256 collateralValue,
        uint256 loanAmount
    ) internal view returns (uint256 creditScore) {
        CreditProfile memory profile = creditProfiles[user];
        
        // Start with base score
        creditScore = riskParams.baseScore;
        
        // On-chain transaction history bonus (max 200 points)
        uint256 onchainBonus = _calculateOnchainBonus(user);
        creditScore += onchainBonus;
        
        // Collateral ratio bonus (max 175 points)
        if (collateralValue > 0 && loanAmount > 0) {
            uint256 collateralBonus = _calculateCollateralBonus(collateralValue, loanAmount);
            creditScore += collateralBonus;
        }
        
        // Wallet age bonus (max 125 points)
        uint256 walletAge = profile.walletAge > 0 ? profile.walletAge : _getWalletAge(user);
        uint256 walletAgeBonus = _calculateWalletAgeBonus(walletAge);
        creditScore += walletAgeBonus;
        
        // Payment history adjustments
        if (profile.successfulPayments > 0) {
            // Bonus for successful payments (up to 50 points)
            uint256 paymentBonus = profile.successfulPayments * 2;
            if (paymentBonus > 50) paymentBonus = 50;
            creditScore += paymentBonus;
        }
        
        // Penalties
        if (profile.missedPayments > 0) {
            uint256 missedPenalty = profile.missedPayments * riskParams.missedPaymentPenalty;
            if (creditScore > missedPenalty) {
                creditScore -= missedPenalty;
            } else {
                creditScore = MIN_SCORE;
            }
        }
        
        if (profile.hasDefaulted) {
            if (creditScore > riskParams.defaultPenalty) {
                creditScore -= riskParams.defaultPenalty;
            } else {
                creditScore = MIN_SCORE;
            }
        }
        
        // Ensure score is within valid range
        if (creditScore < MIN_SCORE) creditScore = MIN_SCORE;
        if (creditScore > SCORE_SCALE) creditScore = SCORE_SCALE;
    }

    /**
     * @dev Calculate on-chain activity bonus
     * @param user The user's address
     * @return bonus The calculated bonus points
     */
    function _calculateOnchainBonus(address user) internal view returns (uint256 bonus) {
        // Simplified on-chain activity assessment
        // In production, this would analyze:
        // - Transaction frequency and volume
        // - DeFi protocol usage
        // - Smart contract interactions
        // - Token holdings diversity
        
        // For now, use a basic heuristic based on transaction count
        uint256 txCount = _getTransactionCount(user);
        
        if (txCount >= 1000) {
            bonus = riskParams.maxOnchainBonus; // 200 points
        } else if (txCount >= 500) {
            bonus = (riskParams.maxOnchainBonus * 80) / 100; // 160 points
        } else if (txCount >= 100) {
            bonus = (riskParams.maxOnchainBonus * 60) / 100; // 120 points
        } else if (txCount >= 50) {
            bonus = (riskParams.maxOnchainBonus * 40) / 100; // 80 points
        } else if (txCount >= 10) {
            bonus = (riskParams.maxOnchainBonus * 20) / 100; // 40 points
        } else {
            bonus = 0;
        }
    }

    /**
     * @dev Calculate collateral ratio bonus
     * @param collateralValue The collateral value
     * @param loanAmount The loan amount
     * @return bonus The calculated bonus points
     */
    function _calculateCollateralBonus(
        uint256 collateralValue,
        uint256 loanAmount
    ) internal view returns (uint256 bonus) {
        uint256 collateralRatio = (collateralValue * BASIS_POINTS) / loanAmount;
        
        if (collateralRatio >= 20000) { // 200%+
            bonus = riskParams.maxCollateralBonus; // 175 points
        } else if (collateralRatio >= 15000) { // 150%+
            bonus = (riskParams.maxCollateralBonus * 80) / 100; // 140 points
        } else if (collateralRatio >= 12500) { // 125%+
            bonus = (riskParams.maxCollateralBonus * 60) / 100; // 105 points
        } else if (collateralRatio >= 11000) { // 110%+ (minimum)
            bonus = (riskParams.maxCollateralBonus * 40) / 100; // 70 points
        } else {
            bonus = 0;
        }
    }

    /**
     * @dev Calculate wallet age bonus
     * @param walletAgeDays The wallet age in days
     * @return bonus The calculated bonus points
     */
    function _calculateWalletAgeBonus(uint256 walletAgeDays) internal view returns (uint256 bonus) {
        if (walletAgeDays >= 365) { // 1+ years
            bonus = riskParams.maxWalletAgeBonus; // 125 points
        } else if (walletAgeDays >= 180) { // 6+ months
            bonus = (riskParams.maxWalletAgeBonus * 80) / 100; // 100 points
        } else if (walletAgeDays >= 90) { // 3+ months
            bonus = (riskParams.maxWalletAgeBonus * 60) / 100; // 75 points
        } else if (walletAgeDays >= 30) { // 1+ month
            bonus = (riskParams.maxWalletAgeBonus * 40) / 100; // 50 points
        } else if (walletAgeDays >= 7) { // 1+ week
            bonus = (riskParams.maxWalletAgeBonus * 20) / 100; // 25 points
        } else {
            bonus = 0;
        }
    }

    /**
     * @dev Get risk tier based on credit score
     * @param creditScore The credit score
     * @return tier The risk tier
     */
    function _getRiskTier(uint256 creditScore) internal view returns (RiskTier tier) {
        if (creditScore >= tierMinScores[RiskTier.LOW]) {
            return RiskTier.LOW;
        } else if (creditScore >= tierMinScores[RiskTier.MEDIUM]) {
            return RiskTier.MEDIUM;
        } else if (creditScore >= tierMinScores[RiskTier.HIGH]) {
            return RiskTier.HIGH;
        } else {
            return RiskTier.DENIED;
        }
    }

    /**
     * @dev Update credit score
     * @param user The user's address
     * @param points The points to add or subtract
     * @param isBonus Whether this is a bonus (true) or penalty (false)
     */
    function _updateCreditScore(address user, uint256 points, bool isBonus) internal {
        CreditProfile storage profile = creditProfiles[user];
        uint256 oldScore = profile.creditScore;
        
        if (isBonus) {
            profile.creditScore += points;
            if (profile.creditScore > SCORE_SCALE) {
                profile.creditScore = SCORE_SCALE;
            }
        } else {
            if (profile.creditScore > points) {
                profile.creditScore -= points;
            } else {
                profile.creditScore = MIN_SCORE;
            }
        }
        
        // Update risk tier
        profile.currentTier = _getRiskTier(profile.creditScore);
        
        emit CreditScoreUpdated(user, oldScore, profile.creditScore);
    }

    /**
     * @dev Get wallet age in days (simplified)
     * @param user The user's address
     * @return age Wallet age in days
     */
    function _getWalletAge(address user) internal view returns (uint256 age) {
        // Simplified wallet age calculation
        // In production, this would require off-chain data or oracles
        // For now, use a heuristic based on address characteristics
        
        uint256 addressNum = uint256(uint160(user));
        // Use last 4 digits to simulate age (0-9999 days, max ~27 years)
        age = (addressNum % 10000) / 10; // 0-999 days
        
        // Ensure minimum age of 1 day for existing addresses
        if (age == 0) age = 1;
    }

    /**
     * @dev Get transaction count for an address (simplified)
     * @param user The user's address
     * @return count Transaction count
     */
    function _getTransactionCount(address user) internal view returns (uint256 count) {
        // Simplified transaction count
        // In production, this would use the actual nonce or off-chain indexing
        
        uint256 addressNum = uint256(uint160(user));
        // Use different digits to simulate transaction count
        count = ((addressNum / 10000) % 10000); // 0-9999 transactions
    }
}