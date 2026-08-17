package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.example.reviewshopbackend.config.SepayProperties;
import com.example.reviewshopbackend.dto.request.SepayWebhookRequest;
import com.example.reviewshopbackend.dto.response.SepayPaymentResponse;
import com.example.reviewshopbackend.entity.DepositOrder;
import com.example.reviewshopbackend.exception.PaymentProviderNotConfiguredException;
import com.example.reviewshopbackend.exception.SepayWebhookAuthenticationException;
import com.example.reviewshopbackend.service.DepositService;
import com.example.reviewshopbackend.service.SepayDepositService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class SepayDepositServiceImpl implements SepayDepositService {
    private static final String PROVIDER = "SEPAY";
    private static final String AUTHORIZATION_PREFIX = "Apikey ";

    private final DepositService depositService;
    private final SepayProperties properties;

    public SepayDepositServiceImpl(DepositService depositService, SepayProperties properties) {
        this.depositService = depositService;
        this.properties = properties;
    }

    @Override
    @Transactional
    public DepositOrder create(String clientEmail, BigDecimal amount, String idempotencyKey) {
        requirePaymentConfiguration();
        return depositService.create(clientEmail, amount, PROVIDER, idempotencyKey);
    }

    @Override
    public SepayPaymentResponse paymentDetails(DepositOrder deposit) {
        requirePaymentConfiguration();
        String paymentCode = paymentCode(deposit.getId());
        String qrCodeUrl = UriComponentsBuilder.fromUriString("https://vietqr.app/img")
                .queryParam("acc", properties.bankAccount())
                .queryParam("bank", properties.bankCode())
                .queryParam("amount", deposit.getRequestedAmount().stripTrailingZeros().toPlainString())
                .queryParam("des", paymentCode)
                .queryParam("template", "compact")
                .build()
                .encode()
                .toUriString();
        return new SepayPaymentResponse(
                paymentCode,
                properties.bankAccount(),
                properties.bankCode(),
                properties.accountHolder().isBlank() ? null : properties.accountHolder(),
                qrCodeUrl
        );
    }

    @Override
    @Transactional
    public DepositOrder handleWebhook(SepayWebhookRequest request, String authorizationHeader) {
        requireWebhookConfiguration();
        validateAuthorization(authorizationHeader);
        validateWebhook(request);

        Long depositId = findDepositId(request);
        String providerReference = PROVIDER + ":" + request.id();
        return depositService.confirm(depositId, request.transferAmount(), providerReference);
    }

    private void validateWebhook(SepayWebhookRequest request) {
        if (request == null || request.id() == null || request.id() <= 0) {
            throw new IllegalArgumentException("SePay webhook transaction id is required");
        }
        if (!"in".equalsIgnoreCase(normalize(request.transferType()))) {
            throw new IllegalArgumentException("Only incoming SePay transactions can confirm deposits");
        }
        if (request.transferAmount() == null || request.transferAmount().signum() <= 0) {
            throw new IllegalArgumentException("SePay transfer amount must be greater than zero");
        }
        if (!properties.webhookBankAccount().isBlank()
                && !properties.webhookBankAccount().equals(normalize(request.accountNumber()))) {
            throw new IllegalArgumentException("SePay transaction account does not match the configured account");
        }
    }

    private Long findDepositId(SepayWebhookRequest request) {
        String rawCode = normalize(request.code());
        if (rawCode.isBlank()) {
            rawCode = normalize(request.content());
        }
        if (rawCode.isBlank()) {
            throw new IllegalArgumentException("SePay payment code is missing");
        }

        Pattern pattern = Pattern.compile(
                "(?i)(?<![A-Z0-9])" + Pattern.quote(properties.paymentCodePrefix())
                        + "(\\d+)(?![A-Z0-9])");
        Matcher matcher = pattern.matcher(rawCode);
        if (!matcher.find()) {
            throw new IllegalArgumentException("SePay payment code is invalid");
        }
        try {
            Long depositId = Long.valueOf(matcher.group(1));
            if (!paymentCode(depositId).equalsIgnoreCase(matcher.group())) {
                throw new IllegalArgumentException("SePay payment code is invalid");
            }
            return depositId;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("SePay payment code is invalid", exception);
        }
    }

    private String paymentCode(Long depositId) {
        if (depositId == null || depositId <= 0) {
            throw new IllegalArgumentException("Deposit order id is required to create a SePay payment code");
        }
        return properties.paymentCodePrefix() + depositId;
    }

    private void validateAuthorization(String authorizationHeader) {
        String expected = AUTHORIZATION_PREFIX + properties.webhookApiKey();
        String actual = normalize(authorizationHeader);
        if (!actual.regionMatches(true, 0, AUTHORIZATION_PREFIX, 0, AUTHORIZATION_PREFIX.length())
                || !MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8))) {
            throw new SepayWebhookAuthenticationException();
        }
    }

    private void requirePaymentConfiguration() {
        if (!properties.paymentConfigurationReady()) {
            throw new PaymentProviderNotConfiguredException(
                    "SePay is not configured. Set SEPAY_ENABLED, SEPAY_BANK_ACCOUNT and SEPAY_BANK_CODE");
        }
        validatePaymentCodePrefix();
    }

    private void requireWebhookConfiguration() {
        if (!properties.webhookConfigurationReady()) {
            throw new PaymentProviderNotConfiguredException(
                    "SePay webhook is not configured. Set SEPAY_ENABLED and SEPAY_WEBHOOK_API_KEY");
        }
        validatePaymentCodePrefix();
    }

    private void validatePaymentCodePrefix() {
        if (!properties.paymentCodePrefix().matches("[A-Z]{2,5}")) {
            throw new PaymentProviderNotConfiguredException(
                    "SEPAY_PAYMENT_CODE_PREFIX must contain 2 to 5 letters");
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
