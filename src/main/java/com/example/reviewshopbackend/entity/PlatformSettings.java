package com.example.reviewshopbackend.entity;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "platform_settings")
public class PlatformSettings {
    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(name = "platform_fee_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal platformFeeRate;

    @Column(name = "withdrawal_enabled", nullable = false)
    private boolean withdrawalEnabled;

    @Column(name = "withdrawal_min_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal withdrawalMinAmount;

    @Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "withdrawal_fee_type", nullable = false, length = 20)
    private WithdrawalFeeType withdrawalFeeType;

    @Column(name = "withdrawal_fee_value", nullable = false, precision = 19, scale = 4)
    private BigDecimal withdrawalFeeValue;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    @Version
    @Column(nullable = false)
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
