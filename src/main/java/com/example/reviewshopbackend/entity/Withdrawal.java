package com.example.reviewshopbackend.entity;

import java.math.BigDecimal;
import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter @Setter @NoArgsConstructor
@Entity
@Check(constraints = "amount > 0 and fee_amount >= 0 and net_amount >= 0 and amount = fee_amount + net_amount")
@Table(name = "withdrawals", uniqueConstraints = {
        @UniqueConstraint(name = "uk_withdrawal_code", columnNames = "code"),
        @UniqueConstraint(name = "uk_withdrawal_freelancer_idempotency", columnNames = {"freelancer_id", "idempotency_key"}),
        @UniqueConstraint(name = "uk_withdrawal_provider_reference", columnNames = {"provider", "provider_reference"})
})
public class Withdrawal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 40, unique = true)
    private String code;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private User freelancer;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_method_id")
    private PayoutMethod payoutMethod;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
    @Column(name = "fee_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal feeAmount;
    @Column(name = "net_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal netAmount;
    @Column(nullable = false, length = 3)
    private String currency;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private WithdrawalStatus status;
    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;
    @Column(name = "request_fingerprint", nullable = false, length = 64)
    private String requestFingerprint;
    @Enumerated(EnumType.STRING) @Column(name = "payout_type_snapshot", nullable = false, length = 20)
    private PayoutMethodType payoutTypeSnapshot;
    @Column(name = "bank_code_snapshot", nullable = false, length = 20)
    private String bankCodeSnapshot;
    @Column(name = "bank_name_snapshot", nullable = false, length = 120)
    private String bankNameSnapshot;
    @Column(name = "account_number_encrypted_snapshot", nullable = false, columnDefinition = "TEXT")
    private String accountNumberEncryptedSnapshot;
    @Column(name = "account_number_last4_snapshot", nullable = false, length = 4)
    private String accountNumberLast4Snapshot;
    @Column(name = "account_holder_name_snapshot", nullable = false)
    private String accountHolderNameSnapshot;
    @Column(name = "qr_image_object_key_snapshot", length = 512)
    private String qrImageObjectKeySnapshot;
    @Column(length = 40) private String provider;
    @Column(name = "provider_reference", length = 120) private String providerReference;
    @Column(name = "failure_reason", length = 1000) private String failureReason;
    @Column(name = "admin_note", length = 1000) private String adminNote;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "processed_by") private User processedBy;
    @Column(name = "processed_at") private Instant processedAt;
    @Column(name = "completed_at") private Instant completedAt;
    @Version @Column(nullable = false) private Long version;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;
}
