package com.example.reviewshopbackend.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "account_transactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_account_transaction_idempotency", columnNames = "idempotency_key")
})
public class AccountTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_balance_id", nullable = false)
    private AccountBalance accountBalance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AccountTransactionType type;

    @Column(name = "available_delta", nullable = false, precision = 19, scale = 2)
    private BigDecimal availableDelta;

    @Column(name = "held_delta", nullable = false, precision = 19, scale = 2)
    private BigDecimal heldDelta;

    @Column(name = "available_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal availableAfter;

    @Column(name = "held_after", nullable = false, precision = 19, scale = 2)
    private BigDecimal heldAfter;

    @Column(name = "reference_type", nullable = false, length = 40)
    private String referenceType;

    @Column(name = "reference_id", nullable = false, length = 100)
    private String referenceId;

    @Column(name = "idempotency_key", nullable = false, length = 160)
    private String idempotencyKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
