// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CollateralManager
 * @dev Manages collateral for Base-BNPL loans
 * Handles collateral locking, valuation, and liquidation
 */
contract CollateralManager is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAYMENT_CONTROLLER_ROLE = keccak256("PAYMENT_CONTROLLER_ROLE");
    bytes32 public constant PRICE_ORACLE_ROLE = keccak256("PRICE_ORACLE_ROLE");

    struct CollateralPosition {
        address owner;
        address token;
        uint256 amount;
        uint256 lockedAt;
        uint256 loanId;
        bool isLocked;
    }

    struct TokenConfig {
        bool isSupported;
        uint256 liquidationThreshold; // in basis points (11000 = 110%)
        uint256 liquidationBonus;     // in basis points (500 = 5%)
        uint256 maxLoanToValue;       // in basis points (8000 = 80%)
        address priceFeed;            // Price oracle address
    }

    // State variables
    mapping(uint256 => CollateralPosition) public collateralPositions; // loanId => position
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => uint256) public tokenPrices; // USD price with 8 decimals
    
    address[] public supportedTokens;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_DECIMALS = 8; // Price in USD with 8 decimals
    uint256 public liquidationDelay = 48 hours; // Grace period before liquidation

    // Events
    event CollateralLocked(
        uint256 indexed loanId,
        address indexed owner,
        address indexed token,
        uint256 amount
    );
    event CollateralReleased(
        uint256 indexed loanId,
        address indexed owner,
        address indexed token,
        uint256 amount
    );
    event CollateralLiquidated(
        uint256 indexed loanId,
        address indexed token,
        uint256 collateralAmount,
        uint256 recoveredAmount
    );
    event TokenConfigured(address indexed token, uint256 liquidationThreshold, uint256 maxLTV);
    event PriceUpdated(address indexed token, uint256 newPrice);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Lock collateral for a loan
     * @param owner The collateral owner
     * @param token The collateral token address
     * @param amount The collateral amount
     * @param loanId The loan ID
     */
    function lockCollateral(
        address owner,
        address token,
        uint256 amount,
        uint256 loanId
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant {
        require(owner != address(0), "CollateralManager: Invalid owner");
        require(token != address(0), "CollateralManager: Invalid token");
        require(amount > 0, "CollateralManager: Invalid amount");
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        require(!collateralPositions[loanId].isLocked, "CollateralManager: Collateral already locked");

        // Transfer collateral from owner
        IERC20(token).safeTransferFrom(owner, address(this), amount);

        // Create collateral position
        collateralPositions[loanId] = CollateralPosition({
            owner: owner,
            token: token,
            amount: amount,
            lockedAt: block.timestamp,
            loanId: loanId,
            isLocked: true
        });

        emit CollateralLocked(loanId, owner, token, amount);
    }

    /**
     * @dev Release collateral back to owner
     * @param loanId The loan ID
     * @param owner The collateral owner
     * @param token The collateral token address
     * @param amount The collateral amount
     */
    function releaseCollateral(
        uint256 loanId,
        address owner,
        address token,
        uint256 amount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant {
        CollateralPosition storage position = collateralPositions[loanId];
        
        require(position.isLocked, "CollateralManager: No collateral locked");
        require(position.owner == owner, "CollateralManager: Invalid owner");
        require(position.token == token, "CollateralManager: Invalid token");
        require(position.amount >= amount, "CollateralManager: Insufficient collateral");

        // Update position
        position.amount -= amount;
        if (position.amount == 0) {
            position.isLocked = false;
        }

        // Transfer collateral back to owner
        IERC20(token).safeTransfer(owner, amount);

        emit CollateralReleased(loanId, owner, token, amount);
    }

    /**
     * @dev Liquidate collateral for a defaulted loan
     * @param loanId The loan ID
     * @param token The collateral token address
     * @param amount The collateral amount to liquidate
     * @return recoveredAmount The amount recovered from liquidation
     */
    function liquidateCollateral(
        uint256 loanId,
        address token,
        uint256 amount
    ) external onlyRole(PAYMENT_CONTROLLER_ROLE) nonReentrant returns (uint256 recoveredAmount) {
        CollateralPosition storage position = collateralPositions[loanId];
        
        require(position.isLocked, "CollateralManager: No collateral locked");
        require(position.token == token, "CollateralManager: Invalid token");
        require(position.amount >= amount, "CollateralManager: Insufficient collateral");
        require(
            block.timestamp >= position.lockedAt + liquidationDelay,
            "CollateralManager: Liquidation delay not met"
        );

        // Calculate recovery amount (with liquidation bonus)
        uint256 tokenPrice = getTokenPrice(token);
        uint256 collateralValue = (amount * tokenPrice) / (10 ** IERC20Metadata(token).decimals());
        
        TokenConfig memory config = tokenConfigs[token];
        uint256 liquidationBonus = (collateralValue * config.liquidationBonus) / BASIS_POINTS;
        recoveredAmount = collateralValue + liquidationBonus;

        // Update position
        position.amount -= amount;
        if (position.amount == 0) {
            position.isLocked = false;
        }

        // In a real implementation, this would involve DEX swaps or auctions
        // For now, we simulate by transferring equivalent USDC value
        // This would need integration with Uniswap/other DEXs
        
        emit CollateralLiquidated(loanId, token, amount, recoveredAmount);
    }

    /**
     * @dev Get collateral value in USD
     * @param token The token address
     * @param amount The token amount
     * @return value The USD value with 8 decimals
     */
    function getCollateralValue(address token, uint256 amount) external view returns (uint256 value) {
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        
        uint256 tokenPrice = getTokenPrice(token);
        uint256 tokenDecimals = IERC20Metadata(token).decimals();
        
        value = (amount * tokenPrice) / (10 ** tokenDecimals);
    }

    /**
     * @dev Get token price from oracle
     * @param token The token address
     * @return price The token price in USD with 8 decimals
     */
    function getTokenPrice(address token) public view returns (uint256 price) {
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        
        price = tokenPrices[token];
        require(price > 0, "CollateralManager: Price not available");
    }

    /**
     * @dev Update token price (called by oracle)
     * @param token The token address
     * @param price The new price in USD with 8 decimals
     */
    function updateTokenPrice(address token, uint256 price) 
        external 
        onlyRole(PRICE_ORACLE_ROLE) 
    {
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        require(price > 0, "CollateralManager: Invalid price");
        
        tokenPrices[token] = price;
        emit PriceUpdated(token, price);
    }

    /**
     * @dev Configure a token for use as collateral
     * @param token The token address
     * @param liquidationThreshold The liquidation threshold in basis points
     * @param liquidationBonus The liquidation bonus in basis points
     * @param maxLoanToValue The maximum loan-to-value ratio in basis points
     * @param priceFeed The price feed address
     */
    function configureToken(
        address token,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 maxLoanToValue,
        address priceFeed
    ) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "CollateralManager: Invalid token address");
        require(liquidationThreshold >= BASIS_POINTS, "CollateralManager: Invalid liquidation threshold");
        require(liquidationBonus <= 2000, "CollateralManager: Liquidation bonus too high"); // Max 20%
        require(maxLoanToValue <= BASIS_POINTS, "CollateralManager: Invalid max LTV");

        bool wasSupported = tokenConfigs[token].isSupported;
        
        tokenConfigs[token] = TokenConfig({
            isSupported: true,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            maxLoanToValue: maxLoanToValue,
            priceFeed: priceFeed
        });

        if (!wasSupported) {
            supportedTokens.push(token);
        }

        emit TokenConfigured(token, liquidationThreshold, maxLoanToValue);
    }

    /**
     * @dev Remove token support
     * @param token The token address
     */
    function removeTokenSupport(address token) external onlyRole(ADMIN_ROLE) {
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        
        tokenConfigs[token].isSupported = false;
        
        // Remove from supported tokens array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
    }

    /**
     * @dev Check if liquidation is needed for a position
     * @param loanId The loan ID
     * @param loanAmount The outstanding loan amount
     * @return needsLiquidation Whether liquidation is needed
     */
    function checkLiquidation(uint256 loanId, uint256 loanAmount) 
        external 
        view 
        returns (bool needsLiquidation) 
    {
        CollateralPosition memory position = collateralPositions[loanId];
        
        if (!position.isLocked) {
            return false;
        }

        uint256 collateralValue = getCollateralValue(position.token, position.amount);
        TokenConfig memory config = tokenConfigs[position.token];
        
        uint256 liquidationThreshold = (loanAmount * config.liquidationThreshold) / BASIS_POINTS;
        
        needsLiquidation = collateralValue < liquidationThreshold;
    }

    /**
     * @dev Get collateral position details
     * @param loanId The loan ID
     * @return position The collateral position
     */
    function getCollateralPosition(uint256 loanId) 
        external 
        view 
        returns (CollateralPosition memory position) 
    {
        return collateralPositions[loanId];
    }

    /**
     * @dev Get all supported tokens
     * @return tokens Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return supportedTokens;
    }

    /**
     * @dev Calculate maximum loan amount for given collateral
     * @param token The collateral token
     * @param amount The collateral amount
     * @return maxLoan The maximum loan amount
     */
    function calculateMaxLoan(address token, uint256 amount) 
        external 
        view 
        returns (uint256 maxLoan) 
    {
        require(tokenConfigs[token].isSupported, "CollateralManager: Token not supported");
        
        uint256 collateralValue = getCollateralValue(token, amount);
        TokenConfig memory config = tokenConfigs[token];
        
        maxLoan = (collateralValue * config.maxLoanToValue) / BASIS_POINTS;
    }

    /**
     * @dev Set liquidation delay
     * @param newDelay The new liquidation delay in seconds
     */
    function setLiquidationDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        require(newDelay <= 7 days, "CollateralManager: Delay too long");
        liquidationDelay = newDelay;
    }

    /**
     * @dev Emergency withdrawal of tokens (admin only)
     * @param token The token address
     * @param amount The amount to withdraw
     * @param to The recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "CollateralManager: Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
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
}

// Interface for ERC20 tokens with metadata
interface IERC20Metadata is IERC20 {
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}