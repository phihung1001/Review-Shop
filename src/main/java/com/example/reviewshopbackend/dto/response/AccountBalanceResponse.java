package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.AccountBalance;

public record AccountBalanceResponse(
        String currency,
        BigDecimal availableAmount,
        BigDecimal heldAmount
) {
    public static AccountBalanceResponse from(AccountBalance balance) {
        return new AccountBalanceResponse(
                balance.getCurrency(),
                balance.getAvailableAmount(),
                balance.getHeldAmount()
        );
    }
}
