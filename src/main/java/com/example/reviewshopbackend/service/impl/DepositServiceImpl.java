package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;

import com.example.reviewshopbackend.entity.DepositOrder;
import com.example.reviewshopbackend.entity.DepositStatus;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.DepositOrderRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.service.DepositService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepositServiceImpl implements DepositService {
    private final DepositOrderRepository depositRepository;
    private final UserRepository userRepository;
    private final AccountBalanceService accountBalanceService;

    public DepositServiceImpl(
            DepositOrderRepository depositRepository,
            UserRepository userRepository,
            AccountBalanceService accountBalanceService
    ) {
        this.depositRepository = depositRepository;
        this.userRepository = userRepository;
        this.accountBalanceService = accountBalanceService;
    }

    @Override
    @Transactional
    public DepositOrder create(String clientEmail, BigDecimal amount, String provider, String idempotencyKey) {
        User client = requireClient(clientEmail);
        String normalizedKey = idempotencyKey.trim();
        return depositRepository.findByClientAndIdempotencyKey(client, normalizedKey).map(existing -> {
            BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.UNNECESSARY);
            String normalizedProvider = provider.trim().toUpperCase(Locale.ROOT);
            if (existing.getRequestedAmount().compareTo(normalizedAmount) != 0
                    || !existing.getProvider().equals(normalizedProvider)) {
                throw new IllegalArgumentException("Idempotency key was already used with different deposit data");
            }
            return existing;
        }).orElseGet(() -> {
            DepositOrder deposit = new DepositOrder();
            deposit.setClient(client);
            deposit.setRequestedAmount(amount.setScale(2, RoundingMode.UNNECESSARY));
            if (deposit.getRequestedAmount().signum() <= 0) {
                throw new IllegalArgumentException("Deposit amount must be greater than zero");
            }
            deposit.setCurrency(AccountBalanceServiceImpl.CURRENCY);
            deposit.setProvider(provider.trim().toUpperCase(Locale.ROOT));
            deposit.setIdempotencyKey(normalizedKey);
            deposit.setStatus(DepositStatus.PENDING);
            return depositRepository.save(deposit);
        });
    }

    @Override
    @Transactional
    public DepositOrder confirm(Long depositId, BigDecimal receivedAmount, String providerReference) {
        DepositOrder deposit = depositRepository.findByIdForUpdate(depositId)
                .orElseThrow(() -> new IllegalArgumentException("Deposit order not found"));
        if (deposit.getStatus() == DepositStatus.SUCCEEDED) {
            if (deposit.getReceivedAmount().compareTo(receivedAmount.setScale(2, RoundingMode.UNNECESSARY)) != 0
                    || !deposit.getProviderReference().equals(providerReference.trim())) {
                throw new IllegalArgumentException("Deposit was already confirmed with different provider data");
            }
            return deposit;
        }
        BigDecimal normalizedAmount = receivedAmount.setScale(2, RoundingMode.UNNECESSARY);
        if (normalizedAmount.compareTo(deposit.getRequestedAmount()) != 0) {
            throw new IllegalArgumentException("Received amount does not match requested deposit amount");
        }
        deposit.setReceivedAmount(normalizedAmount);
        deposit.setProviderReference(providerReference.trim());
        deposit.setStatus(DepositStatus.SUCCEEDED);
        deposit.setCompletedAt(Instant.now());
        accountBalanceService.creditDeposit(deposit.getClient(), normalizedAmount, deposit.getId().toString());
        return deposit;
    }

    private User requireClient(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        if (user.getRole() != UserRole.CLIENT) {
            throw new AccessDeniedException("User does not have the required role");
        }
        return user;
    }
}
