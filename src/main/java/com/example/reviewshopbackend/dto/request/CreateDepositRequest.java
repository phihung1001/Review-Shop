package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateDepositRequest(
        @NotNull @DecimalMin(value = "1.00") @Digits(integer = 17, fraction = 2)
        BigDecimal amount,
        @NotBlank @Size(max = 40)
        String provider,
        @NotBlank @Size(max = 100)
        String idempotencyKey
) {
}
