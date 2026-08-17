package com.example.reviewshopbackend.dto.response;

public record SepayPaymentResponse(
        String paymentCode,
        String bankAccount,
        String bankCode,
        String accountHolder,
        String qrCodeUrl
) {
}
