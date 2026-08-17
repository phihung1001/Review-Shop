package com.example.reviewshopbackend.service;

import java.math.BigDecimal;

import com.example.reviewshopbackend.dto.request.SepayWebhookRequest;
import com.example.reviewshopbackend.dto.response.SepayPaymentResponse;
import com.example.reviewshopbackend.entity.DepositOrder;

public interface SepayDepositService {
    DepositOrder create(String clientEmail, BigDecimal amount, String idempotencyKey);

    SepayPaymentResponse paymentDetails(DepositOrder deposit);

    DepositOrder handleWebhook(SepayWebhookRequest request, String authorizationHeader);
}
