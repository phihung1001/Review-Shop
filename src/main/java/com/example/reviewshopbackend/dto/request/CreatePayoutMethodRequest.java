package com.example.reviewshopbackend.dto.request;

import com.example.reviewshopbackend.entity.PayoutMethodType;
import jakarta.validation.constraints.*;

public record CreatePayoutMethodRequest(
        @NotNull PayoutMethodType type,
        @NotBlank @Size(max = 20) String bankCode,
        @NotBlank @Size(max = 120) String bankName,
        @NotBlank @Pattern(regexp = "[0-9]{6,30}") String accountNumber,
        @NotBlank @Size(max = 255) String accountHolderName,
        @NotBlank @Size(max = 512) String qrImageObjectKey,
        boolean isDefault
) {}
