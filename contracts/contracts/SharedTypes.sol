// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SharedTypes
 * @dev Common type definitions shared across the Base-BNPL protocol
 * This ensures type consistency and eliminates enum conversion issues
 */
library SharedTypes {
    /**
     * @dev Risk tier classification for loans
     * Used across all protocol contracts for consistency
     */
    enum RiskTier {
        LOW,        // Credit score 750+, low risk borrowers
        MEDIUM,     // Credit score 600-749, medium risk borrowers  
        HIGH,       // Credit score 300-599, high risk borrowers
        DENIED      // Below 300 or other rejection criteria
    }

    /**
     * @dev Loan status enumeration
     * Tracks the complete lifecycle of a loan
     */
    enum LoanStatus {
        PENDING,    // Initial application state
        APPROVED,   // Risk assessment passed
        ACTIVE,     // Loan funded and payments scheduled
        COMPLETED,  // All payments made successfully
        DEFAULTED,  // Missed payments beyond threshold
        LIQUIDATED  // Collateral liquidated
    }

    /**
     * @dev Payment status enumeration
     * Tracks individual payment states
     */
    enum PaymentStatus {
        PENDING,    // Payment scheduled but not yet due
        PAID,       // Payment made on time
        LATE,       // Payment made after grace period
        MISSED      // Payment not made within threshold
    }

    /**
     * @dev Convert RiskTier enum to uint8 for external interfaces
     * @param tier The RiskTier to convert
     * @return The uint8 representation
     */
    function riskTierToUint(RiskTier tier) internal pure returns (uint8) {
        return uint8(tier);
    }

    /**
     * @dev Convert uint8 to RiskTier enum with bounds checking
     * @param value The uint8 value to convert
     * @return The RiskTier enum value
     */
    function uintToRiskTier(uint8 value) internal pure returns (RiskTier) {
        require(value <= uint8(RiskTier.DENIED), "SharedTypes: Invalid risk tier value");
        return RiskTier(value);
    }

    /**
     * @dev Get risk tier name as string (for events and debugging)
     * @param tier The RiskTier to get name for
     * @return The string name of the risk tier
     */
    function getRiskTierName(RiskTier tier) internal pure returns (string memory) {
        if (tier == RiskTier.LOW) return "LOW";
        if (tier == RiskTier.MEDIUM) return "MEDIUM";
        if (tier == RiskTier.HIGH) return "HIGH";
        if (tier == RiskTier.DENIED) return "DENIED";
        return "UNKNOWN";
    }
}