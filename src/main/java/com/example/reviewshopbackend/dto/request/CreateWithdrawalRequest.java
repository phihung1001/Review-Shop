package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;
import jakarta.validation.constraints.*;

public record CreateWithdrawalRequest(
        @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @NotBlank @Pattern(regexp = "VND") String currency,
        @NotNull @Positive Long payoutMethodId
) {}
