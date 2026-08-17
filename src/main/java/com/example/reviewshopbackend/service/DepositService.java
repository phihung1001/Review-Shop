package com.example.reviewshopbackend.service;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.DepositOrder;

public interface DepositService {
    DepositOrder create(String clientEmail, BigDecimal amount, String provider, String idempotencyKey);
    DepositOrder confirm(Long depositId, BigDecimal receivedAmount, String providerReference);
}
