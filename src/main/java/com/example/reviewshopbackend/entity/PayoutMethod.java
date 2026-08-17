package com.example.reviewshopbackend.entity;

import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter @Setter @NoArgsConstructor
@Entity
@Table(name = "payout_methods")
public class PayoutMethod {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private User freelancer;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private PayoutMethodType type;
    @Column(name = "bank_code", nullable = false, length = 20)
    private String bankCode;
    @Column(name = "bank_name", nullable = false, length = 120)
    private String bankName;
    @Column(name = "account_number_encrypted", nullable = false, columnDefinition = "TEXT")
    private String accountNumberEncrypted;
    @Column(name = "account_number_last4", nullable = false, length = 4)
    private String accountNumberLast4;
    @Column(name = "account_holder_name", nullable = false)
    private String accountHolderName;
    @Column(name = "qr_image_object_key", length = 512)
    private String qrImageObjectKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private PayoutMethodStatus status;
    @Column(name = "is_default", nullable = false)
    private boolean defaultMethod;
    @Version @Column(nullable = false)
    private Long version;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
