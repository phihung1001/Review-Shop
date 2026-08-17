package com.example.reviewshopbackend.entity;

import java.time.Instant;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "google_maps_accounts", uniqueConstraints = @UniqueConstraint(
        name = "uk_google_maps_accounts_contributor_id", columnNames = "contributor_id"))
public class GoogleMapsAccount {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private User freelancer;

    @Column(name = "contributor_id", nullable = false, length = 30)
    private String contributorId;

    @Column(name = "profile_url", nullable = false, length = 500)
    private String profileUrl;

    @Column(name = "account_name", nullable = false)
    private String accountName;

    @Column(length = 2048)
    private String thumbnail;

    @Column(name = "local_guide_level", nullable = false)
    private Integer localGuideLevel;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "review_count", nullable = false)
    private Integer reviewCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", length = 20)
    private GoogleMapsAccountType accountType;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "verified_at", nullable = false)
    private Instant verifiedAt;

    @Version @Column(nullable = false)
    private Long version;

    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
