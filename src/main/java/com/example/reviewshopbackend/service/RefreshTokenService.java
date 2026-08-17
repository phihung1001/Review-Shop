package com.example.reviewshopbackend.service;

import java.time.Duration;

import com.example.reviewshopbackend.entity.User;

/**
 * Manages opaque refresh tokens, rotation families, and session revocation.
 * Raw token values must never be persisted or logged; implementations store only cryptographic hashes.
 */
public interface RefreshTokenService {
    /**
     * Starts a new refresh-token family for a user session.
     *
     * @param user authenticated user
     * @return raw token and cookie lifetime
     */
    IssuedToken issue(User user);

    /**
     * Consumes a refresh token exactly once and creates its replacement.
     * Reuse of a consumed token invalidates its complete rotation family.
     *
     * @param rawToken token received from the HTTP-only cookie
     * @return user and replacement refresh-token data
     */
    RotatedToken rotate(String rawToken);

    /**
     * Revokes the session family containing the supplied token.
     *
     * @param rawToken token received from the HTTP-only cookie; may be absent
     */
    void revoke(String rawToken);

    /**
     * Revokes every refresh-token session belonging to a user.
     *
     * @param user session owner
     */
    void revokeAllForUser(User user);

    /** Raw refresh token returned only to the cookie-writing web layer. */
    record IssuedToken(String value, Duration ttl) {
    }

    /** Result of a successful one-time refresh-token rotation. */
    record RotatedToken(User user, String value, Duration ttl) {
    }
}
