package com.example.reviewshopbackend.config;

import java.util.Locale;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.sepay")
public record SepayProperties(
        boolean enabled,
        String webhookApiKey,
        String bankAccount,
        String bankCode,
        String accountHolder,
        String paymentCodePrefix,
        String webhookBankAccount
) {
    public SepayProperties {
        webhookApiKey = normalize(webhookApiKey);
        bankAccount = normalize(bankAccount);
        bankCode = normalize(bankCode);
        accountHolder = normalize(accountHolder);
        paymentCodePrefix = normalize(paymentCodePrefix).toUpperCase(Locale.ROOT);
        webhookBankAccount = normalize(webhookBankAccount);
        if (paymentCodePrefix.isBlank()) {
            paymentCodePrefix = "SEPAY";
        }
        if (webhookBankAccount.isBlank()) {
            webhookBankAccount = bankAccount;
        }
    }

    public boolean paymentConfigurationReady() {
        return enabled && !bankAccount.isBlank() && !bankCode.isBlank();
    }

    public boolean webhookConfigurationReady() {
        return enabled && !webhookApiKey.isBlank();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
