package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;

public record SepayWebhookRequest(
        Long id,
        String gateway,
        String transactionDate,
        String accountNumber,
        String subAccount,
        String code,
        String content,
        String transferType,
        String description,
        BigDecimal transferAmount,
        BigDecimal accumulated,
        String referenceCode
) {
}
