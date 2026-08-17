package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record RequiredLevelRequest(
        @NotBlank String description,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 17, fraction = 2)
        BigDecimal pricePerReview,
        @Min(1) @Max(10) Integer rank
) {
}
