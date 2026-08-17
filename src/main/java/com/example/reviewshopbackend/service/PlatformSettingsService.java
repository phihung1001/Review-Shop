package com.example.reviewshopbackend.service;

import java.math.BigDecimal;

import com.example.reviewshopbackend.dto.response.PlatformSettingsResponse;
import com.example.reviewshopbackend.entity.PlatformSettings;
import com.example.reviewshopbackend.entity.WithdrawalFeeType;

/**
 * Manages singleton platform-wide commercial settings.
 */
public interface PlatformSettingsService {
    /**
     * @return the platform fee rate currently applied to new jobs
     */
    BigDecimal getCurrentPlatformFeeRate();

    /**
     * @return current platform settings, creating defaults when no settings row exists
     */
    PlatformSettingsResponse getSettings();

    /**
     * Updates the fee rate and records the administrator responsible for the change.
     *
     * @param platformFeeRate decimal rate in the range [0, 1)
     * @param adminEmail authenticated administrator email
     * @return updated platform settings
     */
    PlatformSettingsResponse updatePlatformFeeRate(BigDecimal platformFeeRate, String adminEmail);
    PlatformSettings getCurrentSettings();
    PlatformSettingsResponse updateWithdrawalSettings(boolean enabled, BigDecimal minimumAmount,
            WithdrawalFeeType feeType, BigDecimal feeValue, String adminEmail);
}
