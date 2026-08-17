package com.example.reviewshopbackend.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import com.example.reviewshopbackend.config.R2StorageProperties;
import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

class ProofImageStorageServiceImplTest {
    @Mock private UserRepository userRepository;
    private AutoCloseable mocks;
    private S3Presigner presigner;
    private ProofImageStorageServiceImpl service;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        var credentials = StaticCredentialsProvider.create(AwsBasicCredentials.create("access", "secret"));
        presigner = S3Presigner.builder()
                .endpointOverride(URI.create("https://account.r2.cloudflarestorage.com"))
                .credentialsProvider(credentials).region(Region.of("auto"))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build()).build();
        var properties = new R2StorageProperties(URI.create("https://account.r2.cloudflarestorage.com"),
                "access", "secret", "proofs", "auto", Duration.ofMinutes(10), Duration.ofMinutes(30), 3_145_728);
        service = new ProofImageStorageServiceImpl(presigner, properties, userRepository,
                Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC));
    }

    @AfterEach void tearDown() throws Exception { presigner.close(); mocks.close(); }

    @Test
    void createsOwnerScopedPresignedUpload() {
        User user = freelancer(42L);
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(user));
        var response = service.createUpload(new CreateImageUploadRequest("proof.png", "image/png", 1024),
                "Worker@Example.com");
        assertThat(response.objectKey()).startsWith("proofs/42/").endsWith(".png");
        assertThat(response.uploadUrl()).contains("X-Amz-Signature=");
        assertThat(response.requiredHeaders()).containsEntry("Content-Type", "image/png")
                .containsEntry("Content-Length", "1024");
        assertThat(response.expiresAt()).isEqualTo(Instant.parse("2026-08-08T00:10:00Z"));
    }

    @Test
    void rejectsUnsupportedOrOversizedImages() {
        when(userRepository.findByEmail("worker@example.com")).thenReturn(Optional.of(freelancer(42L)));
        assertThatThrownBy(() -> service.createUpload(
                new CreateImageUploadRequest("proof.svg", "image/svg+xml", 100), "worker@example.com"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.createUpload(
                new CreateImageUploadRequest("proof.png", "image/png", 3_145_729), "worker@example.com"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void enforcesOwnershipAndKeepsLegacyUrlsReadable() {
        assertThat(service.requireOwnedObjectKey("proofs/42/image.webp", 42L)).isEqualTo("proofs/42/image.webp");
        assertThatThrownBy(() -> service.requireOwnedObjectKey("proofs/7/image.webp", 42L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(service.createDownloadUrl("https://legacy.example.com/image.jpg"))
                .isEqualTo("https://legacy.example.com/image.jpg");
    }

    private static User freelancer(Long id) {
        User user = new User(); user.setId(id); user.setRole(UserRole.FREELANCER); return user;
    }
}
