package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record UpdatePlatformFeeRequest(
        @NotNull
        @DecimalMin("0.0000")
        @DecimalMax(value = "1.0000", inclusive = false)
        @Digits(integer = 1, fraction = 4)
        BigDecimal platformFeeRate
) {
}
