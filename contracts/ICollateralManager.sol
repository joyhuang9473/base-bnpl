// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICollateralManager
 * @dev Interface for the Base-BNPL collateral management contract
 */
interface ICollateralManager {
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
        uint256 liquidationThreshold;
        uint256 liquidationBonus;
        uint256 maxLoanToValue;
        address priceFeed;
    }

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

    // Core Functions
    function lockCollateral(
        address owner,
        address token,
        uint256 amount,
        uint256 loanId
    ) external;

    function releaseCollateral(
        uint256 loanId,
        address owner,
        address token,
        uint256 amount
    ) external;

    function liquidateCollateral(
        uint256 loanId,
        address token,
        uint256 amount
    ) external returns (uint256 recoveredAmount);

    // Valuation Functions
    function getCollateralValue(address token, uint256 amount) external view returns (uint256);
    function getTokenPrice(address token) external view returns (uint256);
    function calculateMaxLoan(address token, uint256 amount) external view returns (uint256);
    function checkLiquidation(uint256 loanId, uint256 loanAmount) external view returns (bool);

    // View Functions
    function getCollateralPosition(uint256 loanId) external view returns (CollateralPosition memory);
    function getSupportedTokens() external view returns (address[] memory);
    function tokenConfigs(address token) external view returns (TokenConfig memory);
    function tokenPrices(address token) external view returns (uint256);
    function liquidationDelay() external view returns (uint256);

    // Admin Functions
    function configureToken(
        address token,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 maxLoanToValue,
        address priceFeed
    ) external;

    function removeTokenSupport(address token) external;
    function updateTokenPrice(address token, uint256 price) external;
    function setLiquidationDelay(uint256 newDelay) external;
    function emergencyWithdraw(address token, uint256 amount, address to) external;
    function pause() external;
    function unpause() external;
}