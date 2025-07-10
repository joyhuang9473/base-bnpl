// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRiskEngine.sol";
import "./interfaces/IPaymentController.sol";
import "./interfaces/ICollateralManager.sol";

/**
 * @title LendingPool
 * @dev Unified lending pool for Base-BNPL platform
 * Manages lending capital, yield distribution, and risk-based pricing
 */
contract LendingPool is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant PAYMENT_CONTROLLER_ROLE = keccak256("PAYMENT_CONTROLLER_ROLE");

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
        uint256 utilizationRate; // in basis points (10000 = 100%)
        uint256 averageAPY; // in basis points
        uint256 totalLenders;
        uint256 totalBorrowers;
    }

    enum RiskTier {
        LOW,    // 750+ credit score
        MEDIUM, // 600-749 credit score  
        HIGH    // 300-599 credit score
    }

    // State variables
    IERC20 public immutable usdcToken;
    IRiskEngine public riskEngine;
    IPaymentController public paymentController;
    ICollateralManager public collateralManager;

    PoolStats public poolStats;
    mapping(address => LenderPosition) public lenderPositions;
    mapping(RiskTier => uint256) public tierAPY; // APY in basis points
    mapping(RiskTier => uint256) public tierLiquidity;
    
    uint256 public constant RESERVE_RATIO = 200; // 2% reserve fund
    uint256 public constant MAX_UTILIZATION = 9000; // 90% max utilization
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant BASIS_POINTS = 10000;

    uint256 public reserveFund;
    uint256 private _totalSupply;

    // Events
    event Deposited(address indexed lender, uint256 amount, RiskTier tier);
    event Withdrawn(address indexed lender, uint256 amount);
    event YieldDistributed(address indexed lender, uint256 amount);
    event LoanFunded(uint256 indexed loanId, address indexed borrower, uint256 amount, RiskTier tier);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event DefaultHandled(uint256 indexed loanId, uint256 lossAmount);
    event APYUpdated(RiskTier tier, uint256 newAPY);

    constructor(
        address _usdcToken,
        address _riskEngine,
        address _paymentController,
        address _collateralManager
    ) {
        require(_usdcToken != address(0), "LendingPool: Invalid USDC address");
        require(_riskEngine != address(0), "LendingPool: Invalid RiskEngine address");
        require(_paymentController != address(0), "LendingPool: Invalid PaymentController address");
        require(_collateralManager != address(0), "LendingPool: Invalid CollateralManager address");

        usdcToken = IERC20(_usdcToken);
        riskEngine = IRiskEngine(_riskEngine);
        paymentController = IPaymentController(_paymentController);
        collateralManager = ICollateralManager(_collateralManager);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Initialize tier APYs (in basis points)
        tierAPY[RiskTier.LOW] = 400;    // 4% APY
        tierAPY[RiskTier.MEDIUM] = 800; // 8% APY  
        tierAPY[RiskTier.HIGH] = 1500;  // 15% APY
    }

    /**
     * @dev Deposit USDC into the lending pool
     * @param amount Amount of USDC to deposit
     * @param riskTier Preferred risk tier for allocation
     */
    function deposit(uint256 amount, RiskTier riskTier) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "LendingPool: Amount must be greater than 0");
        
        // Update lender's yield before deposit
        _updateLenderYield(msg.sender);
        
        // Transfer USDC from lender
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update lender position
        LenderPosition storage position = lenderPositions[msg.sender];
        if (position.deposited == 0) {
            poolStats.totalLenders++;
        }
        
        position.deposited += amount;
        position.riskTier = riskTier;
        position.lastUpdateTime = block.timestamp;
        
        // Update pool stats
        poolStats.totalLiquidity += amount;
        tierLiquidity[riskTier] += amount;
        _totalSupply += amount;
        
        // Reserve fund allocation
        uint256 reserveAmount = (amount * RESERVE_RATIO) / BASIS_POINTS;
        reserveFund += reserveAmount;
        
        emit Deposited(msg.sender, amount, riskTier);
    }

    /**
     * @dev Withdraw USDC from the lending pool
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        LenderPosition storage position = lenderPositions[msg.sender];
        require(position.deposited >= amount, "LendingPool: Insufficient balance");
        
        // Update yield before withdrawal
        _updateLenderYield(msg.sender);
        
        // Check liquidity availability
        uint256 availableLiquidity = _getAvailableLiquidity();
        require(availableLiquidity >= amount, "LendingPool: Insufficient pool liquidity");
        
        // Update position
        position.deposited -= amount;
        tierLiquidity[position.riskTier] -= amount;
        
        if (position.deposited == 0) {
            poolStats.totalLenders--;
        }
        
        // Update pool stats
        poolStats.totalLiquidity -= amount;
        _totalSupply -= amount;
        
        // Transfer USDC to lender
        usdcToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Claim accumulated yield
     */
    function claimYield() external nonReentrant whenNotPaused {
        _updateLenderYield(msg.sender);
        
        LenderPosition storage position = lenderPositions[msg.sender];
        uint256 yieldAmount = position.yieldEarned;
        
        require(yieldAmount > 0, "LendingPool: No yield to claim");
        
        position.yieldEarned = 0;
        poolStats.totalYieldPaid += yieldAmount;
        
        // Transfer yield to lender
        usdcToken.safeTransfer(msg.sender, yieldAmount);
        
        emit YieldDistributed(msg.sender, yieldAmount);
    }

    /**
     * @dev Fund a loan (called by PaymentController)
     * @param loanId The loan ID
     * @param borrower The borrower address
     * @param amount Amount to fund
     * @param riskTier Risk tier of the loan
     */
    function fundLoan(
        uint256 loanId,
        address borrower,
        uint256 amount,
        RiskTier riskTier
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant {
        require(amount > 0, "LendingPool: Invalid amount");
        require(borrower != address(0), "LendingPool: Invalid borrower");
        
        // Check available liquidity for the risk tier
        require(_getAvailableLiquidity() >= amount, "LendingPool: Insufficient liquidity");
        
        // Update pool stats
        poolStats.totalLoaned += amount;
        poolStats.totalBorrowers++;
        
        // Transfer funds to borrower
        usdcToken.safeTransfer(borrower, amount);
        
        emit LoanFunded(loanId, borrower, amount, riskTier);
    }

    /**
     * @dev Process loan repayment
     * @param loanId The loan ID
     * @param amount Repayment amount
     * @param riskTier Risk tier of the loan
     */
    function repayLoan(
        uint256 loanId,
        uint256 amount,
        RiskTier riskTier
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant {
        require(amount > 0, "LendingPool: Invalid amount");
        
        // Receive repayment
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update pool stats
        poolStats.totalLoaned -= amount;
        poolStats.totalLiquidity += amount;
        
        // Distribute yield to lenders
        _distributeYield(amount, riskTier);
        
        emit LoanRepaid(loanId, amount);
    }

    /**
     * @dev Handle loan default
     * @param loanId The defaulted loan ID
     * @param lossAmount Amount lost due to default
     * @param recoveredAmount Amount recovered from liquidation
     */
    function handleDefault(
        uint256 loanId,
        uint256 lossAmount,
        uint256 recoveredAmount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant {
        require(lossAmount > 0, "LendingPool: Invalid loss amount");
        
        // Use reserve fund to cover losses
        if (reserveFund >= lossAmount) {
            reserveFund -= lossAmount;
        } else {
            // Distribute losses across lenders proportionally
            _distributeLoss(lossAmount - reserveFund);
            reserveFund = 0;
        }
        
        // Add recovered amount back to pool
        if (recoveredAmount > 0) {
            poolStats.totalLiquidity += recoveredAmount;
        }
        
        // Update stats
        poolStats.totalDefaulted += lossAmount;
        poolStats.totalLoaned -= lossAmount;
        
        emit DefaultHandled(loanId, lossAmount);
    }

    /**
     * @dev Update APY for a risk tier
     * @param tier Risk tier to update
     * @param newAPY New APY in basis points
     */
    function updateTierAPY(RiskTier tier, uint256 newAPY) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(newAPY <= 5000, "LendingPool: APY too high"); // Max 50%
        tierAPY[tier] = newAPY;
        emit APYUpdated(tier, newAPY);
    }

    /**
     * @dev Get lender position details
     * @param lender Lender address
     * @return position Lender position struct
     */
    function getLenderPosition(address lender) 
        external 
        view 
        returns (LenderPosition memory position) 
    {
        position = lenderPositions[lender];
        
        // Calculate pending yield
        if (position.deposited > 0) {
            uint256 timeElapsed = block.timestamp - position.lastUpdateTime;
            uint256 pendingYield = _calculateYield(
                position.deposited,
                tierAPY[position.riskTier],
                timeElapsed
            );
            position.yieldEarned += pendingYield;
        }
    }

    /**
     * @dev Get current pool statistics
     * @return stats Current pool stats
     */
    function getPoolStats() external view returns (PoolStats memory stats) {
        stats = poolStats;
        
        // Calculate current utilization rate
        if (stats.totalLiquidity > 0) {
            stats.utilizationRate = (stats.totalLoaned * BASIS_POINTS) / stats.totalLiquidity;
        }
        
        // Calculate weighted average APY
        uint256 totalWeightedAPY = 0;
        uint256 totalLiquidity = 0;
        
        for (uint256 i = 0; i < 3; i++) {
            RiskTier tier = RiskTier(i);
            uint256 tierLiq = tierLiquidity[tier];
            if (tierLiq > 0) {
                totalWeightedAPY += tierAPY[tier] * tierLiq;
                totalLiquidity += tierLiq;
            }
        }
        
        if (totalLiquidity > 0) {
            stats.averageAPY = totalWeightedAPY / totalLiquidity;
        }
    }

    /**
     * @dev Get available liquidity for lending
     * @return Available liquidity amount
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return _getAvailableLiquidity();
    }

    /**
     * @dev Pause the contract (emergency function)
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
     * @dev Update lender's accumulated yield
     * @param lender Lender address
     */
    function _updateLenderYield(address lender) internal {
        LenderPosition storage position = lenderPositions[lender];
        
        if (position.deposited > 0 && position.lastUpdateTime > 0) {
            uint256 timeElapsed = block.timestamp - position.lastUpdateTime;
            uint256 yield = _calculateYield(
                position.deposited,
                tierAPY[position.riskTier],
                timeElapsed
            );
            
            position.yieldEarned += yield;
        }
        
        position.lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Calculate yield for a given amount, APY, and time period
     * @param principal Principal amount
     * @param apy APY in basis points
     * @param timeElapsed Time elapsed in seconds
     * @return yield Calculated yield
     */
    function _calculateYield(
        uint256 principal,
        uint256 apy,
        uint256 timeElapsed
    ) internal pure returns (uint256 yield) {
        // Yield = Principal * APY * (timeElapsed / SECONDS_PER_YEAR) / BASIS_POINTS
        yield = (principal * apy * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }

    /**
     * @dev Distribute yield to lenders based on risk tier
     * @param totalYield Total yield to distribute
     * @param riskTier Risk tier of the generating loan
     */
    function _distributeYield(uint256 totalYield, RiskTier riskTier) internal {
        uint256 tierLiq = tierLiquidity[riskTier];
        
        if (tierLiq == 0) return;
        
        // Distribute proportionally to lenders in this risk tier
        // This is a simplified version - in production, would iterate through all lenders
        // or use a more efficient distribution mechanism
    }

    /**
     * @dev Distribute losses proportionally across all lenders
     * @param lossAmount Total loss amount to distribute
     */
    function _distributeLoss(uint256 lossAmount) internal {
        if (_totalSupply == 0) return;
        
        // Reduce each lender's position proportionally
        // This is a simplified version - in production, would need more sophisticated logic
    }

    /**
     * @dev Get available liquidity for new loans
     * @return Available liquidity considering max utilization
     */
    function _getAvailableLiquidity() internal view returns (uint256) {
        uint256 maxLoaned = (poolStats.totalLiquidity * MAX_UTILIZATION) / BASIS_POINTS;
        
        if (poolStats.totalLoaned >= maxLoaned) {
            return 0;
        }
        
        return maxLoaned - poolStats.totalLoaned;
    }
}