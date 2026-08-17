package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.entity.User;

/**
 * Issues short-lived, signed JWT access tokens for authenticated users.
 */
public interface JwtTokenService {
    /**
     * Creates a signed access token containing the user's identity, role, and authentication version.
     *
     * @param user authenticated user
     * @return encoded token and its lifetime in seconds
     */
    Token issue(User user);

    /**
     * @param value compact JWT value
     * @param expiresInSeconds token lifetime in seconds
     */
    record Token(String value, long expiresInSeconds) {
    }
}
