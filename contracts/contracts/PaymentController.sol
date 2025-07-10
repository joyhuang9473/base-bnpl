// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILendingPool.sol";
import "./interfaces/IRiskEngine.sol";
import "./interfaces/ICollateralManager.sol";
import "./SharedTypes.sol";

/**
 * @title PaymentController
 * @dev Manages loan creation, payment processing, and installment scheduling
 * Handles the complete loan lifecycle from application to completion/default
 */
contract PaymentController is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;
    using SharedTypes for SharedTypes.RiskTier;
    using SharedTypes for SharedTypes.LoanStatus;
    using SharedTypes for SharedTypes.PaymentStatus;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");

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
        uint256 interestRate;     // basis points (0 for interest-free)
        uint256 lateFeeRate;      // basis points per missed payment
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
        uint256 settlementDelay; // seconds before settlement
    }

    // State variables
    IERC20 public immutable usdcToken;
    ILendingPool public immutable lendingPool;
    IRiskEngine public immutable riskEngine;
    ICollateralManager public immutable collateralManager;

    uint256 public nextLoanId = 1;
    uint256 public nextPaymentId = 1;
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Payment) public payments;
    mapping(uint256 => uint256[]) public loanPayments; // loanId => paymentIds
    mapping(address => uint256[]) public borrowerLoans; // borrower => loanIds
    mapping(address => uint256[]) public merchantLoans; // merchant => loanIds
    mapping(address => Merchant) public merchants;
    
    // Payment terms templates
    mapping(string => PaymentTerms) public paymentTemplates;
    
    uint256 public constant LATE_PAYMENT_GRACE_PERIOD = 2 days;
    uint256 public constant DEFAULT_THRESHOLD_DAYS = 30 days;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;

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

    constructor(
        address _usdcToken,
        address _lendingPool,
        address _riskEngine,
        address _collateralManager
    ) {
        require(_usdcToken != address(0), "PaymentController: Invalid USDC address");
        require(_lendingPool != address(0), "PaymentController: Invalid LendingPool address");
        require(_riskEngine != address(0), "PaymentController: Invalid RiskEngine address");
        require(_collateralManager != address(0), "PaymentController: Invalid CollateralManager address");

        usdcToken = IERC20(_usdcToken);
        lendingPool = ILendingPool(_lendingPool);
        riskEngine = IRiskEngine(_riskEngine);
        collateralManager = ICollateralManager(_collateralManager);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Initialize standard payment templates
        _initializePaymentTemplates();
    }

    /**
     * @dev Create a new loan application
     * @param merchant The merchant address
     * @param principal The loan principal amount
     * @param collateralAmount The collateral amount
     * @param collateralToken The collateral token address
     * @param termsTemplate The payment terms template name
     * @return loanId The created loan ID
     */
    function createLoan(
        address merchant,
        uint256 principal,
        uint256 collateralAmount,
        address collateralToken,
        string calldata termsTemplate
    ) external nonReentrant whenNotPaused returns (uint256 loanId) {
        require(principal > 0, "PaymentController: Invalid principal amount");
        require(collateralAmount > 0, "PaymentController: Invalid collateral amount");
        require(merchants[merchant].isActive, "PaymentController: Merchant not active");
        require(paymentTemplates[termsTemplate].installments > 0, "PaymentController: Invalid terms template");
        
        // Get collateral value
        uint256 collateralValue = collateralManager.getCollateralValue(collateralToken, collateralAmount);
        
        // Assess risk
        IRiskEngine.AssessmentResult memory assessment = riskEngine.assessRisk(
            msg.sender,
            principal,
            collateralAmount,
            collateralValue
        );

        require(assessment.approved, assessment.reason);

        // Lock collateral
        collateralManager.lockCollateral(
            msg.sender,
            collateralToken,
            collateralAmount,
            nextLoanId
        );

        // Create loan
        loanId = nextLoanId++;
        PaymentTerms memory terms = paymentTemplates[termsTemplate];
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            merchant: merchant,
            principal: principal,
            totalAmount: _calculateTotalAmount(principal, terms.interestRate),
            collateralAmount: collateralAmount,
            collateralToken: collateralToken,
            terms: terms,
            status: SharedTypes.LoanStatus.APPROVED,
            createdAt: block.timestamp,
            nextPaymentDue: 0,
            paidAmount: 0,
            remainingAmount: _calculateTotalAmount(principal, terms.interestRate),
            riskTier: assessment.riskTier
        });

        // Update mappings
        borrowerLoans[msg.sender].push(loanId);
        merchantLoans[merchant].push(loanId);

        // Record loan in risk engine
        riskEngine.recordLoan(msg.sender, principal);

        emit LoanCreated(loanId, msg.sender, merchant, principal, assessment.riskTier);
        emit LoanApproved(loanId, principal);
    }

    /**
     * @dev Fund an approved loan
     * @param loanId The loan ID to fund
     */
    function fundLoan(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.status == SharedTypes.LoanStatus.APPROVED, "PaymentController: Loan not approved");
        require(loan.borrower != address(0), "PaymentController: Loan does not exist");

        // Fund loan from lending pool
        lendingPool.fundLoan(loanId, loan.borrower, loan.principal, loan.riskTier);

        // Update loan status
        loan.status = SharedTypes.LoanStatus.ACTIVE;
        loan.nextPaymentDue = block.timestamp + (loan.terms.intervalDays * SECONDS_PER_DAY);

        // Create payment schedule
        _createPaymentSchedule(loanId);

        // Settle merchant immediately
        _settleMerchant(loan.merchant, loan.principal);

        emit LoanFunded(loanId, loan.principal);
    }

    /**
     * @dev Make a payment for a loan
     * @param paymentId The payment ID
     */
    function makePayment(uint256 paymentId) external nonReentrant whenNotPaused {
        Payment storage payment = payments[paymentId];
        Loan storage loan = loans[payment.loanId];
        
        require(payment.status == SharedTypes.PaymentStatus.PENDING, "PaymentController: Payment already made");
        require(loan.borrower == msg.sender, "PaymentController: Not loan borrower");
        require(loan.status == SharedTypes.LoanStatus.ACTIVE, "PaymentController: Loan not active");

        uint256 totalPayment = payment.amount;
        uint256 lateFee = 0;

        // Calculate late fee if payment is overdue
        if (block.timestamp > payment.dueDate + LATE_PAYMENT_GRACE_PERIOD) {
            lateFee = _calculateLateFee(payment.amount, loan.terms.lateFeeRate);
            totalPayment += lateFee;
            payment.status = SharedTypes.PaymentStatus.LATE;
        } else {
            payment.status = SharedTypes.PaymentStatus.PAID;
        }

        // Transfer payment from borrower
        usdcToken.safeTransferFrom(msg.sender, address(this), totalPayment);

        // Update payment
        payment.paidDate = block.timestamp;
        payment.lateFee = lateFee;

        // Update loan
        loan.paidAmount += totalPayment;
        loan.remainingAmount -= payment.amount;

        // Update next payment due date
        _updateNextPaymentDue(payment.loanId);

        // Send payment to lending pool
        usdcToken.safeTransfer(address(lendingPool), payment.amount);
        
        // Send late fee to reserve if applicable
        if (lateFee > 0) {
            usdcToken.safeTransfer(address(lendingPool), lateFee);
        }

        // Process repayment in lending pool
        lendingPool.repayLoan(payment.loanId, payment.amount, loan.riskTier);

        // Record payment in risk engine
        bool onTime = payment.status == SharedTypes.PaymentStatus.PAID;
        riskEngine.recordPayment(msg.sender, payment.amount, onTime);

        // Check if loan is completed
        if (loan.remainingAmount == 0) {
            _completeLoan(payment.loanId);
        }

        emit PaymentMade(payment.loanId, paymentId, payment.amount, lateFee);
    }

    /**
     * @dev Process automatic payment (called by automation system)
     * @param paymentId The payment ID
     */
    function processAutoPayment(uint256 paymentId) external onlyRole(ADMIN_ROLE) {
        Payment storage payment = payments[paymentId];
        Loan storage loan = loans[payment.loanId];
        
        require(payment.status == SharedTypes.PaymentStatus.PENDING, "PaymentController: Payment already processed");
        require(loan.status == SharedTypes.LoanStatus.ACTIVE, "PaymentController: Loan not active");

        // Check if borrower has sufficient balance (simplified check)
        uint256 borrowerBalance = usdcToken.balanceOf(loan.borrower);
        
        if (borrowerBalance >= payment.amount) {
            // Attempt automatic payment
            try this.makePayment(paymentId) {
                // Payment successful
            } catch {
                // Mark as missed if auto-payment fails
                _markPaymentMissed(paymentId);
            }
        } else {
            // Insufficient balance - mark as missed
            _markPaymentMissed(paymentId);
        }
    }

    /**
     * @dev Liquidate a defaulted loan
     * @param loanId The loan ID to liquidate
     */
    function liquidateLoan(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.status == SharedTypes.LoanStatus.DEFAULTED, "PaymentController: Loan not in default");

        // Liquidate collateral
        uint256 recoveredAmount = collateralManager.liquidateCollateral(
            loanId,
            loan.collateralToken,
            loan.collateralAmount
        );

        // Handle default in lending pool
        lendingPool.handleDefault(loanId, loan.remainingAmount, recoveredAmount);

        // Record default in risk engine
        riskEngine.recordDefault(loan.borrower, loan.remainingAmount);

        // Update loan status
        loan.status = SharedTypes.LoanStatus.LIQUIDATED;

        emit LoanDefaulted(loanId, loan.remainingAmount);
    }

    /**
     * @dev Register a new merchant
     * @param merchant The merchant address
     * @param name The merchant name
     * @param settlementDelay Settlement delay in seconds
     */
    function registerMerchant(
        address merchant,
        string calldata name,
        uint256 settlementDelay
    ) external onlyRole(ADMIN_ROLE) {
        require(merchant != address(0), "PaymentController: Invalid merchant address");
        require(bytes(name).length > 0, "PaymentController: Empty merchant name");

        merchants[merchant] = Merchant({
            name: name,
            wallet: merchant,
            totalVolume: 0,
            totalOrders: 0,
            isActive: true,
            settlementDelay: settlementDelay
        });

        _grantRole(MERCHANT_ROLE, merchant);

        emit MerchantRegistered(merchant, name);
    }

    /**
     * @dev Get loan details
     * @param loanId The loan ID
     * @return loan The loan struct
     */
    function getLoan(uint256 loanId) external view returns (Loan memory loan) {
        return loans[loanId];
    }

    /**
     * @dev Get payment details
     * @param paymentId The payment ID
     * @return payment The payment struct
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory payment) {
        return payments[paymentId];
    }

    /**
     * @dev Get all payments for a loan
     * @param loanId The loan ID
     * @return paymentIds Array of payment IDs
     */
    function getLoanPayments(uint256 loanId) external view returns (uint256[] memory paymentIds) {
        return loanPayments[loanId];
    }

    /**
     * @dev Get all loans for a borrower
     * @param borrower The borrower address
     * @return loanIds Array of loan IDs
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory loanIds) {
        return borrowerLoans[borrower];
    }

    /**
     * @dev Get upcoming payment for a loan
     * @param loanId The loan ID
     * @return paymentId The next payment ID, 0 if none
     */
    function getUpcomingPayment(uint256 loanId) external view returns (uint256 paymentId) {
        uint256[] memory paymentIds = loanPayments[loanId];
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            Payment memory payment = payments[paymentIds[i]];
            if (payment.status == SharedTypes.PaymentStatus.PENDING) {
                return paymentIds[i];
            }
        }
        
        return 0;
    }

    /**
     * @dev Check for defaulted loans and update status
     * @param loanIds Array of loan IDs to check
     */
    function checkForDefaults(uint256[] calldata loanIds) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < loanIds.length; i++) {
            Loan storage loan = loans[loanIds[i]];
            
            if (loan.status == SharedTypes.LoanStatus.ACTIVE && 
                block.timestamp > loan.nextPaymentDue + DEFAULT_THRESHOLD_DAYS) {
                loan.status = SharedTypes.LoanStatus.DEFAULTED;
                emit LoanDefaulted(loanIds[i], loan.remainingAmount);
            }
        }
    }

    /**
     * @dev Update payment terms template
     * @param templateName The template name
     * @param terms The payment terms
     */
    function updatePaymentTemplate(
        string calldata templateName,
        PaymentTerms calldata terms
    ) external onlyRole(ADMIN_ROLE) {
        require(terms.installments > 0, "PaymentController: Invalid installments");
        require(terms.intervalDays > 0, "PaymentController: Invalid interval");
        require(terms.lateFeeRate <= 1000, "PaymentController: Late fee too high"); // Max 10%

        paymentTemplates[templateName] = terms;
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
     * @dev Initialize standard payment templates
     */
    function _initializePaymentTemplates() internal {
        // Standard 4-payment plan (6 weeks, 0% interest)
        paymentTemplates["standard"] = PaymentTerms({
            installments: 4,
            intervalDays: 14, // bi-weekly
            interestRate: 0,  // 0% interest
            lateFeeRate: 250  // 2.5% late fee
        });

        // Extended 6-payment plan (3 months, small interest)
        paymentTemplates["extended_6"] = PaymentTerms({
            installments: 6,
            intervalDays: 15, // every 15 days
            interestRate: 300, // 3% total interest
            lateFeeRate: 250   // 2.5% late fee
        });

        // Long-term 12-payment plan (6 months)
        paymentTemplates["extended_12"] = PaymentTerms({
            installments: 12,
            intervalDays: 15, // every 15 days
            interestRate: 600, // 6% total interest
            lateFeeRate: 250   // 2.5% late fee
        });
    }

    /**
     * @dev Create payment schedule for a loan
     * @param loanId The loan ID
     */
    function _createPaymentSchedule(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        uint256 paymentAmount = loan.totalAmount / loan.terms.installments;
        uint256 lastPaymentAmount = loan.totalAmount - (paymentAmount * (loan.terms.installments - 1));

        for (uint256 i = 0; i < loan.terms.installments; i++) {
            uint256 paymentId = nextPaymentId++;
            uint256 amount = (i == loan.terms.installments - 1) ? lastPaymentAmount : paymentAmount;
            uint256 dueDate = loan.createdAt + ((i + 1) * loan.terms.intervalDays * SECONDS_PER_DAY);

            payments[paymentId] = Payment({
                id: paymentId,
                loanId: loanId,
                amount: amount,
                dueDate: dueDate,
                paidDate: 0,
                status: SharedTypes.PaymentStatus.PENDING,
                lateFee: 0
            });

            loanPayments[loanId].push(paymentId);

            emit PaymentScheduled(loanId, paymentId, dueDate);
        }
    }

    /**
     * @dev Calculate total amount including interest
     * @param principal The principal amount
     * @param interestRate The interest rate in basis points
     * @return totalAmount The total amount to be repaid
     */
    function _calculateTotalAmount(uint256 principal, uint256 interestRate) internal pure returns (uint256 totalAmount) {
        totalAmount = principal + ((principal * interestRate) / BASIS_POINTS);
    }

    /**
     * @dev Calculate late fee
     * @param paymentAmount The payment amount
     * @param lateFeeRate The late fee rate in basis points
     * @return lateFee The calculated late fee
     */
    function _calculateLateFee(uint256 paymentAmount, uint256 lateFeeRate) internal pure returns (uint256 lateFee) {
        lateFee = (paymentAmount * lateFeeRate) / BASIS_POINTS;
    }

    /**
     * @dev Update next payment due date for a loan
     * @param loanId The loan ID
     */
    function _updateNextPaymentDue(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        uint256[] memory paymentIds = loanPayments[loanId];

        loan.nextPaymentDue = 0;

        for (uint256 i = 0; i < paymentIds.length; i++) {
            Payment memory payment = payments[paymentIds[i]];
            if (payment.status == SharedTypes.PaymentStatus.PENDING) {
                loan.nextPaymentDue = payment.dueDate;
                break;
            }
        }
    }

    /**
     * @dev Mark a payment as missed
     * @param paymentId The payment ID
     */
    function _markPaymentMissed(uint256 paymentId) internal {
        Payment storage payment = payments[paymentId];
        Loan storage loan = loans[payment.loanId];

        payment.status = SharedTypes.PaymentStatus.MISSED;

        // Record missed payment in risk engine
        riskEngine.recordPayment(loan.borrower, payment.amount, false);

        // Check if loan should be marked as defaulted
        uint256 missedPayments = _countMissedPayments(payment.loanId);
        if (missedPayments >= 2 || 
            block.timestamp > payment.dueDate + DEFAULT_THRESHOLD_DAYS) {
            loan.status = SharedTypes.LoanStatus.DEFAULTED;
        }
    }

    /**
     * @dev Count missed payments for a loan
     * @param loanId The loan ID
     * @return count Number of missed payments
     */
    function _countMissedPayments(uint256 loanId) internal view returns (uint256 count) {
        uint256[] memory paymentIds = loanPayments[loanId];
        
        for (uint256 i = 0; i < paymentIds.length; i++) {
            if (payments[paymentIds[i]].status == SharedTypes.PaymentStatus.MISSED) {
                count++;
            }
        }
    }

    /**
     * @dev Complete a loan
     * @param loanId The loan ID
     */
    function _completeLoan(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        loan.status = SharedTypes.LoanStatus.COMPLETED;

        // Release collateral
        collateralManager.releaseCollateral(
            loanId,
            loan.borrower,
            loan.collateralToken,
            loan.collateralAmount
        );

        // Record loan completion in risk engine
        riskEngine.recordLoanCompletion(loan.borrower, loan.totalAmount);

        emit LoanCompleted(loanId, loan.paidAmount);
    }

    /**
     * @dev Settle payment to merchant
     * @param merchant The merchant address
     * @param amount The settlement amount
     */
    function _settleMerchant(address merchant, uint256 amount) internal {
        Merchant storage merchantData = merchants[merchant];
        
        // Update merchant stats
        merchantData.totalVolume += amount;
        merchantData.totalOrders += 1;

        // Transfer funds to merchant
        usdcToken.safeTransfer(merchant, amount);

        emit MerchantSettlement(merchant, amount);
    }
}