package com.example.reviewshopbackend.service.impl;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import com.example.reviewshopbackend.dto.request.*;
import com.example.reviewshopbackend.dto.response.*;
import com.example.reviewshopbackend.entity.*;
import com.example.reviewshopbackend.exception.*;
import com.example.reviewshopbackend.repository.*;
import com.example.reviewshopbackend.service.*;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WithdrawalServiceImpl implements WithdrawalService {
    private static final Set<WithdrawalStatus> ACTIVE = Set.of(WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING);
    private final WithdrawalRepository repository; private final PayoutMethodRepository payoutMethods;
    private final UserRepository users; private final PlatformSettingsService settingsService;
    private final AccountBalanceService balances; private final PayoutMethodImageStorageService images;
    public WithdrawalServiceImpl(WithdrawalRepository repository, PayoutMethodRepository payoutMethods,
            UserRepository users, PlatformSettingsService settingsService, AccountBalanceService balances,
            PayoutMethodImageStorageService images) {
        this.repository = repository; this.payoutMethods = payoutMethods; this.users = users;
        this.settingsService = settingsService; this.balances = balances; this.images = images;
    }

    @Transactional
    public WithdrawalResponse create(CreateWithdrawalRequest request, String idempotencyKey, String email) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 100)
            throw new IllegalArgumentException("Idempotency-Key header is required and must not exceed 100 characters");
        User found = requireUser(email, UserRole.FREELANCER);
        User freelancer = users.findByIdForUpdate(found.getId()).orElseThrow();
        BigDecimal amount = money(request.amount()); String key = idempotencyKey.trim();
        String fingerprint = fingerprint(amount + "|" + request.currency() + "|" + request.payoutMethodId());
        Optional<Withdrawal> replay = repository.findByFreelancerAndIdempotencyKey(freelancer, key);
        if (replay.isPresent()) {
            if (!replay.orElseThrow().getRequestFingerprint().equals(fingerprint))
                throw new WithdrawalConflictException("Idempotency-Key was already used with different withdrawal data");
            return response(replay.orElseThrow());
        }
        if (repository.existsByFreelancerAndStatusIn(freelancer, ACTIVE))
            throw new WithdrawalConflictException("Freelancer already has an active withdrawal");
        PlatformSettings settings = settingsService.getCurrentSettings();
        if (!settings.isWithdrawalEnabled()) throw new WithdrawalConflictException("Withdrawals are currently disabled");
        if (amount.compareTo(settings.getWithdrawalMinAmount()) < 0)
            throw new IllegalArgumentException("Withdrawal amount is below the configured minimum");
        PayoutMethod method = payoutMethods.findByIdAndFreelancer(request.payoutMethodId(), freelancer)
                .filter(value -> value.getStatus() == PayoutMethodStatus.ACTIVE)
                .orElseThrow(() -> new WithdrawalNotFoundException("Active payout method not found"));
        BigDecimal fee = calculateFee(amount, settings); if (fee.compareTo(amount) >= 0)
            throw new IllegalArgumentException("Withdrawal fee must be less than the withdrawal amount");
        Withdrawal withdrawal = new Withdrawal(); withdrawal.setFreelancer(freelancer); withdrawal.setPayoutMethod(method);
        withdrawal.setAmount(amount); withdrawal.setFeeAmount(fee); withdrawal.setNetAmount(amount.subtract(fee));
        withdrawal.setCurrency("VND"); withdrawal.setStatus(WithdrawalStatus.PENDING); withdrawal.setIdempotencyKey(key);
        withdrawal.setRequestFingerprint(fingerprint); snapshot(withdrawal, method);
        repository.saveAndFlush(withdrawal); withdrawal.setCode("WD-%010d".formatted(withdrawal.getId()));
        balances.holdWithdrawal(withdrawal); return response(repository.saveAndFlush(withdrawal));
    }

    @Transactional(readOnly = true)
    public PageResponse<WithdrawalResponse> findMine(String email, WithdrawalStatus status, int page, int size) {
        User user = requireUser(email, UserRole.FREELANCER); Pageable pageable = pageable(page, size);
        Page<Withdrawal> values = status == null ? repository.findByFreelancer(user, pageable) : repository.findByFreelancerAndStatus(user, status, pageable);
        return PageResponse.from(values.map(this::response));
    }
    @Transactional(readOnly = true)
    public WithdrawalResponse findMineById(Long id, String email) {
        User user = requireUser(email, UserRole.FREELANCER);
        return response(repository.findByIdAndFreelancer(id, user).orElseThrow(() -> new WithdrawalNotFoundException("Withdrawal not found")));
    }
    @Transactional
    public WithdrawalResponse cancel(Long id, String email) {
        User user = requireUser(email, UserRole.FREELANCER); Withdrawal value = lock(id);
        if (!value.getFreelancer().getId().equals(user.getId())) throw new WithdrawalNotFoundException("Withdrawal not found");
        requireStatus(value, WithdrawalStatus.PENDING); value.setStatus(WithdrawalStatus.CANCELLED); value.setCompletedAt(Instant.now());
        balances.releaseWithdrawal(value); return response(value);
    }
    @Transactional(readOnly = true)
    public PageResponse<WithdrawalResponse> findAdmin(WithdrawalStatus status, int page, int size) {
        Pageable pageable = pageable(page, size); Page<Withdrawal> values = status == null ? repository.findAll(pageable) : repository.findByStatus(status, pageable);
        return PageResponse.from(values.map(this::response));
    }
    @Transactional(readOnly = true) public WithdrawalResponse findAdminById(Long id) { return response(repository.findById(id).orElseThrow(() -> new WithdrawalNotFoundException("Withdrawal not found"))); }
    @Transactional public WithdrawalResponse approve(Long id, WithdrawalAdminActionRequest request, String adminEmail) {
        Withdrawal value = lock(id); requireStatus(value, WithdrawalStatus.PENDING); value.setStatus(WithdrawalStatus.PROCESSING);
        applyAdmin(value, request, adminEmail); value.setProcessedAt(Instant.now()); return response(value);
    }
    @Transactional public WithdrawalResponse reject(Long id, WithdrawalAdminActionRequest request, String adminEmail) {
        Withdrawal value = lock(id); requireStatus(value, WithdrawalStatus.PENDING);
        if (blank(request.reason())) throw new IllegalArgumentException("Rejection reason is required");
        value.setStatus(WithdrawalStatus.REJECTED); value.setFailureReason(request.reason().trim()); value.setCompletedAt(Instant.now());
        applyAdmin(value, request, adminEmail); balances.releaseWithdrawal(value); return response(value);
    }
    @Transactional public WithdrawalResponse complete(Long id, WithdrawalAdminActionRequest request, String adminEmail) {
        Withdrawal value = lock(id); requireStatus(value, WithdrawalStatus.PROCESSING);
        if (blank(request.provider()) || blank(request.providerReference())) throw new IllegalArgumentException("Provider and providerReference are required");
        value.setProvider(request.provider().trim().toUpperCase(Locale.ROOT)); value.setProviderReference(request.providerReference().trim());
        value.setStatus(WithdrawalStatus.SUCCEEDED); value.setCompletedAt(Instant.now()); applyAdmin(value, request, adminEmail);
        balances.completeWithdrawal(value); return response(value);
    }
    @Transactional public WithdrawalResponse fail(Long id, WithdrawalAdminActionRequest request, String adminEmail) {
        Withdrawal value = lock(id); requireStatus(value, WithdrawalStatus.PROCESSING);
        if (blank(request.reason())) throw new IllegalArgumentException("Failure reason is required");
        value.setStatus(WithdrawalStatus.FAILED); value.setFailureReason(request.reason().trim()); value.setCompletedAt(Instant.now());
        applyAdmin(value, request, adminEmail); balances.releaseWithdrawal(value); return response(value);
    }
    private void applyAdmin(Withdrawal value, WithdrawalAdminActionRequest request, String email) {
        value.setProcessedBy(requireUser(email, UserRole.ADMIN)); if (!blank(request.adminNote())) value.setAdminNote(request.adminNote().trim());
    }
    private Withdrawal lock(Long id) { return repository.findByIdForUpdate(id).orElseThrow(() -> new WithdrawalNotFoundException("Withdrawal not found")); }
    private void requireStatus(Withdrawal value, WithdrawalStatus expected) { if (value.getStatus() != expected) throw new WithdrawalConflictException("Withdrawal cannot transition from " + value.getStatus()); }
    private User requireUser(String email, UserRole role) { return users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(u -> u.getRole() == role).orElseThrow(() -> new AccessDeniedException("User not found")); }
    private void snapshot(Withdrawal value, PayoutMethod method) { value.setPayoutTypeSnapshot(method.getType()); value.setBankCodeSnapshot(method.getBankCode()); value.setBankNameSnapshot(method.getBankName()); value.setAccountNumberEncryptedSnapshot(method.getAccountNumberEncrypted()); value.setAccountNumberLast4Snapshot(method.getAccountNumberLast4()); value.setAccountHolderNameSnapshot(method.getAccountHolderName()); value.setQrImageObjectKeySnapshot(method.getQrImageObjectKey()); }
    private WithdrawalResponse response(Withdrawal value) { var payout = new WithdrawalResponse.PayoutSnapshot(value.getPayoutTypeSnapshot(), value.getBankCodeSnapshot(), value.getBankNameSnapshot(), "******" + value.getAccountNumberLast4Snapshot(), value.getAccountHolderNameSnapshot(), images.createDownloadUrl(value.getQrImageObjectKeySnapshot())); return new WithdrawalResponse(value.getId(), value.getCode(), value.getAmount(), value.getFeeAmount(), value.getNetAmount(), value.getCurrency(), value.getStatus(), payout, value.getProvider(), value.getProviderReference(), value.getFailureReason(), value.getAdminNote(), value.getCreatedAt(), value.getProcessedAt(), value.getCompletedAt()); }
    private static BigDecimal calculateFee(BigDecimal amount, PlatformSettings settings) { return settings.getWithdrawalFeeType() == WithdrawalFeeType.FIXED ? settings.getWithdrawalFeeValue().setScale(2, RoundingMode.HALF_UP) : amount.multiply(settings.getWithdrawalFeeValue()).setScale(2, RoundingMode.HALF_UP); }
    private static BigDecimal money(BigDecimal value) { return value.setScale(2, RoundingMode.UNNECESSARY); }
    private static Pageable pageable(int page, int size) { if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination"); return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String fingerprint(String value) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch (Exception exception) { throw new IllegalStateException(exception); } }
}
