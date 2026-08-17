package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.example.reviewshopbackend.dto.response.PlatformSettingsResponse;
import com.example.reviewshopbackend.entity.PlatformSettings;
import com.example.reviewshopbackend.entity.WithdrawalFeeType;
import com.example.reviewshopbackend.repository.PlatformSettingsRepository;
import com.example.reviewshopbackend.service.PlatformSettingsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformSettingsServiceImpl implements PlatformSettingsService {
    private final PlatformSettingsRepository repository;
    private final BigDecimal defaultPlatformFeeRate;
    private final BigDecimal defaultWithdrawalMinimum;
    private final BigDecimal defaultWithdrawalFee;

    public PlatformSettingsServiceImpl(
            PlatformSettingsRepository repository,
            @Value("${app.platform.default-fee-rate:0.5000}") BigDecimal defaultPlatformFeeRate,
            @Value("${app.payout.withdrawal-minimum}") BigDecimal defaultWithdrawalMinimum,
            @Value("${app.payout.withdrawal-fee}") BigDecimal defaultWithdrawalFee
    ) {
        this.repository = repository;
        this.defaultPlatformFeeRate = normalizeRate(defaultPlatformFeeRate);
        this.defaultWithdrawalMinimum = defaultWithdrawalMinimum.setScale(2, RoundingMode.UNNECESSARY);
        this.defaultWithdrawalFee = defaultWithdrawalFee.setScale(4, RoundingMode.UNNECESSARY);
    }

    @Override
    @Transactional
    public BigDecimal getCurrentPlatformFeeRate() {
        return getOrCreateSettings().getPlatformFeeRate();
    }

    @Override
    @Transactional
    public PlatformSettingsResponse getSettings() {
        return PlatformSettingsResponse.from(getOrCreateSettings());
    }

    @Override
    @Transactional
    public PlatformSettingsResponse updatePlatformFeeRate(BigDecimal platformFeeRate, String adminEmail) {
        PlatformSettings settings = getOrCreateSettings();
        settings.setPlatformFeeRate(normalizeRate(platformFeeRate));
        settings.setUpdatedBy(adminEmail);
        return PlatformSettingsResponse.from(repository.saveAndFlush(settings));
    }

    @Override
    @Transactional
    public PlatformSettings getCurrentSettings() { return getOrCreateSettings(); }

    @Override
    @Transactional
    public PlatformSettingsResponse updateWithdrawalSettings(boolean enabled, BigDecimal minimumAmount,
            WithdrawalFeeType feeType, BigDecimal feeValue, String adminEmail) {
        if (minimumAmount.signum() <= 0 || feeValue.signum() < 0) throw new IllegalArgumentException("Invalid withdrawal settings");
        if (feeType == WithdrawalFeeType.PERCENTAGE && feeValue.compareTo(new BigDecimal("1.0000")) >= 0)
            throw new IllegalArgumentException("Percentage withdrawal fee must be less than 1");
        PlatformSettings settings = getOrCreateSettings();
        settings.setWithdrawalEnabled(enabled);
        settings.setWithdrawalMinAmount(minimumAmount.setScale(2, RoundingMode.UNNECESSARY));
        settings.setWithdrawalFeeType(feeType);
        settings.setWithdrawalFeeValue(feeValue.setScale(4, RoundingMode.UNNECESSARY));
        settings.setUpdatedBy(adminEmail);
        return PlatformSettingsResponse.from(repository.saveAndFlush(settings));
    }

    private PlatformSettings getOrCreateSettings() {
        return repository.findById(PlatformSettings.SINGLETON_ID).orElseGet(() -> {
            PlatformSettings settings = new PlatformSettings();
            settings.setId(PlatformSettings.SINGLETON_ID);
            settings.setPlatformFeeRate(defaultPlatformFeeRate);
            settings.setWithdrawalEnabled(true);
            settings.setWithdrawalMinAmount(defaultWithdrawalMinimum);
            settings.setWithdrawalFeeType(WithdrawalFeeType.FIXED);
            settings.setWithdrawalFeeValue(defaultWithdrawalFee);
            settings.setUpdatedBy("SYSTEM");
            return repository.saveAndFlush(settings);
        });
    }

    private static BigDecimal normalizeRate(BigDecimal rate) {
        if (rate == null || rate.compareTo(BigDecimal.ZERO) < 0 || rate.compareTo(BigDecimal.ONE) >= 0) {
            throw new IllegalArgumentException("Platform fee rate must be at least 0 and less than 1");
        }
        return rate.setScale(4, RoundingMode.UNNECESSARY);
    }
}
