package com.example.reviewshopbackend.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "jobs", uniqueConstraints = {
        @UniqueConstraint(name = "uk_job_client_idempotency", columnNames = {"client_id", "idempotency_key"})
})
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "request_fingerprint", length = 64)
    private String requestFingerprint;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "link_map", nullable = false, length = 2048)
    private String mapLink;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "required_level_id", nullable = false)
    private RequiredLevel requiredLevel;

    @Column(name = "price_per_review", nullable = false, precision = 19, scale = 2)
    private BigDecimal pricePerReview;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "review_contents", columnDefinition = "json")
    private List<ReviewContent> reviewContents = new ArrayList<>();

    @Column(name = "price_per_task", nullable = false, precision = 19, scale = 2)
    private BigDecimal pricePerTask;

    @Column(name = "total_slots", nullable = false)
    private Integer totalReviews;

    @Column(name = "available_slots", nullable = false)
    private Integer availableSlots;

    @Column(name = "completed_slots", nullable = false)
    private Integer completedSlots;

    @Column(name = "platform_fee_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal platformFeeRate;

    @Column(name = "platform_fee_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal platformFeeAmount;

    @Column(name = "total_budget", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalBudget;

    @Column(name = "freelancer_budget", nullable = false, precision = 19, scale = 2)
    private BigDecimal freelancerBudget;

    @Column(name = "remaining_budget", nullable = false, precision = 19, scale = 2)
    private BigDecimal remainingFreelancerBudget;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

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
