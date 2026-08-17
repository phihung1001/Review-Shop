package com.example.reviewshopbackend.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import com.example.reviewshopbackend.entity.RefreshToken;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.exception.InvalidRefreshTokenException;
import com.example.reviewshopbackend.repository.RefreshTokenRepository;
import com.example.reviewshopbackend.service.RefreshTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class RefreshTokenServiceImpl implements RefreshTokenService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository repository;
    private final Duration refreshTokenTtl;

    public RefreshTokenServiceImpl(
            RefreshTokenRepository repository,
            @Value("${app.jwt.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        if (refreshTokenTtlDays <= 0) {
            throw new IllegalArgumentException("JWT refresh token TTL must be greater than zero");
        }
        this.repository = repository;
        this.refreshTokenTtl = Duration.ofDays(refreshTokenTtlDays);
    }

    @Override
    @Transactional
    public IssuedToken issue(User user) {
        Instant familyExpiresAt = Instant.now().plus(refreshTokenTtl);
        return issue(user, UUID.randomUUID().toString(), familyExpiresAt);
    }

    @Override
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotatedToken rotate(String rawToken) {
        RefreshToken current = find(rawToken);
        Instant now = Instant.now();
        if (current.getRevokedAt() != null
                || current.getUsedAt() != null
                || !current.getExpiresAt().isAfter(now)
                || !current.getFamilyExpiresAt().isAfter(now)) {
            repository.revokeFamily(current.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Invalid or expired refresh token");
        }

        current.setUsedAt(now);
        current.setRevokedAt(now);
        IssuedToken replacement = issue(
                current.getUser(),
                current.getFamilyId(),
                current.getFamilyExpiresAt()
        );
        return new RotatedToken(current.getUser(), replacement.value(), replacement.ttl());
    }

    @Override
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> repository.revokeFamily(token.getFamilyId(), Instant.now()));
    }

    @Override
    @Transactional
    public void revokeAllForUser(User user) {
        repository.revokeAllByUser(user, Instant.now());
    }

    @Scheduled(cron = "${app.jwt.refresh-token-cleanup-cron:0 0 3 * * *}")
    @Transactional
    public void deleteExpiredTokens() {
        repository.deleteByExpiresAtBefore(Instant.now());
    }

    private IssuedToken issue(User user, String familyId, Instant familyExpiresAt) {
        String value = generateToken();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(refreshTokenTtl).isBefore(familyExpiresAt)
                ? now.plus(refreshTokenTtl)
                : familyExpiresAt;
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(value));
        token.setFamilyId(familyId);
        token.setExpiresAt(expiresAt);
        token.setFamilyExpiresAt(familyExpiresAt);
        repository.save(token);
        return new IssuedToken(value, Duration.between(now, expiresAt));
    }

    private RefreshToken find(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidRefreshTokenException("Refresh token is required");
        }
        return repository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("Invalid or expired refresh token"));
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available", exception);
        }
    }
}
