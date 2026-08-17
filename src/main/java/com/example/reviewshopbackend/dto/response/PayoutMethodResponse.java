package com.example.reviewshopbackend.dto.response;

import java.time.Instant;
import com.example.reviewshopbackend.entity.*;

public record PayoutMethodResponse(Long id, PayoutMethodType type, String bankCode, String bankName,
        String maskedAccountNumber, String accountHolderName, String qrImageUrl,
        boolean isDefault, PayoutMethodStatus status, Instant createdAt) {}
