package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import com.example.reviewshopbackend.entity.*;

public record WithdrawalResponse(Long id, String code, BigDecimal amount, BigDecimal feeAmount,
        BigDecimal netAmount, String currency, WithdrawalStatus status,
        PayoutSnapshot payoutMethod, String provider, String providerReference,
        String failureReason, String adminNote, Instant createdAt, Instant processedAt, Instant completedAt) {
    public record PayoutSnapshot(PayoutMethodType type, String bankCode, String bankName,
            String maskedAccountNumber, String accountHolderName, String qrImageUrl) {}
}
