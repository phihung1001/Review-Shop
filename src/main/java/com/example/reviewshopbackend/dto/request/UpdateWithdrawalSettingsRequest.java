package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;
import com.example.reviewshopbackend.entity.WithdrawalFeeType;
import jakarta.validation.constraints.*;

public record UpdateWithdrawalSettingsRequest(
        boolean enabled,
        @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal minimumAmount,
        @NotNull WithdrawalFeeType feeType,
        @NotNull @DecimalMin("0.0") @Digits(integer = 17, fraction = 4) BigDecimal feeValue
) {}
