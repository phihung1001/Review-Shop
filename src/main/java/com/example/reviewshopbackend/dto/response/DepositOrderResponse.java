package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.reviewshopbackend.entity.DepositOrder;
import com.example.reviewshopbackend.entity.DepositStatus;

public record DepositOrderResponse(
        Long id,
        BigDecimal requestedAmount,
        BigDecimal receivedAmount,
        String currency,
        String provider,
        DepositStatus status,
        Instant createdAt,
        Instant completedAt,
        SepayPaymentResponse payment
 ) {
    public static DepositOrderResponse from(DepositOrder deposit) {
        return from(deposit, null);
    }

    public static DepositOrderResponse from(DepositOrder deposit, SepayPaymentResponse payment) {
        return new DepositOrderResponse(
                deposit.getId(),
                deposit.getRequestedAmount(),
                deposit.getReceivedAmount(),
                deposit.getCurrency(),
                deposit.getProvider(),
                deposit.getStatus(),
                deposit.getCreatedAt(),
                deposit.getCompletedAt(),
                payment
        );
    }
}
