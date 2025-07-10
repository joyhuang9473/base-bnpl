// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../SharedTypes.sol";

/**
 * @title IPaymentController
 * @dev Interface for the Base-BNPL payment controller
 */
interface IPaymentController {

    struct Loan {
        uint256 id;
        address borrower;
        address merchant;
        uint256 principal;
        uint256 totalAmount;
        uint256 collateralAmount;
        address collateralToken;
        PaymentTerms terms;
        SharedTypes.LoanStatus status;
        uint256 createdAt;
        uint256 nextPaymentDue;
        uint256 paidAmount;
        uint256 remainingAmount;
        SharedTypes.RiskTier riskTier;
    }

    struct PaymentTerms {
        uint256 installments;
        uint256 intervalDays;
        uint256 interestRate;
        uint256 lateFeeRate;
    }

    struct Payment {
        uint256 id;
        uint256 loanId;
        uint256 amount;
        uint256 dueDate;
        uint256 paidDate;
        SharedTypes.PaymentStatus status;
        uint256 lateFee;
    }

    struct Merchant {
        string name;
        address wallet;
        uint256 totalVolume;
        uint256 totalOrders;
        bool isActive;
        uint256 settlementDelay;
    }

    // Events
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed merchant,
        uint256 amount,
        SharedTypes.RiskTier riskTier
    );
    event LoanApproved(uint256 indexed loanId, uint256 approvedAmount);
    event LoanFunded(uint256 indexed loanId, uint256 fundedAmount);
    event PaymentScheduled(uint256 indexed loanId, uint256 indexed paymentId, uint256 dueDate);
    event PaymentMade(
        uint256 indexed loanId,
        uint256 indexed paymentId,
        uint256 amount,
        uint256 lateFee
    );
    event LoanCompleted(uint256 indexed loanId, uint256 totalPaid);
    event LoanDefaulted(uint256 indexed loanId, uint256 outstandingAmount);
    event MerchantRegistered(address indexed merchant, string name);
    event MerchantSettlement(address indexed merchant, uint256 amount);

    // Core Functions
    function createLoan(
        address merchant,
        uint256 principal,
        uint256 collateralAmount,
        address collateralToken,
        string calldata termsTemplate
    ) external returns (uint256 loanId);

    function fundLoan(uint256 loanId) external;
    function makePayment(uint256 paymentId) external;
    function processAutoPayment(uint256 paymentId) external;
    function liquidateLoan(uint256 loanId) external;

    // Merchant Functions
    function registerMerchant(
        address merchant,
        string calldata name,
        uint256 settlementDelay
    ) external;

    // View Functions
    function getLoan(uint256 loanId) external view returns (Loan memory);
    function getPayment(uint256 paymentId) external view returns (Payment memory);
    function getLoanPayments(uint256 loanId) external view returns (uint256[] memory);
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory);
    function getUpcomingPayment(uint256 loanId) external view returns (uint256);
    function merchants(address merchant) external view returns (Merchant memory);
    function paymentTemplates(string calldata templateName) external view returns (PaymentTerms memory);

    // Admin Functions
    function checkForDefaults(uint256[] calldata loanIds) external;
    function updatePaymentTemplate(
        string calldata templateName,
        PaymentTerms calldata terms
    ) external;
    function pause() external;
    function unpause() external;
}