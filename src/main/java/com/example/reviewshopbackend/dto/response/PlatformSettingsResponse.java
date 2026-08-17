package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.reviewshopbackend.entity.PlatformSettings;
import com.example.reviewshopbackend.entity.WithdrawalFeeType;

public record PlatformSettingsResponse(
        BigDecimal platformFeeRate,
        boolean withdrawalEnabled,
        BigDecimal withdrawalMinimumAmount,
        WithdrawalFeeType withdrawalFeeType,
        BigDecimal withdrawalFeeValue,
        String updatedBy,
        Long version,
        Instant updatedAt
) {
    public static PlatformSettingsResponse from(PlatformSettings settings) {
        return new PlatformSettingsResponse(
                settings.getPlatformFeeRate(),
                settings.isWithdrawalEnabled(),
                settings.getWithdrawalMinAmount(),
                settings.getWithdrawalFeeType(),
                settings.getWithdrawalFeeValue(),
                settings.getUpdatedBy(),
                settings.getVersion(),
                settings.getUpdatedAt()
        );
    }
}
