package com.example.reviewshopbackend.service;

import java.time.Duration;

import com.example.reviewshopbackend.dto.response.AuthResponse;

/**
 * Carries the public authentication payload together with refresh-token data
 * that must only be written to a secure HTTP-only cookie by the web layer.
 *
 * @param response public response returned to the client
 * @param refreshToken opaque refresh-token value; never serialize this value in a response body or log it
 * @param refreshTokenTtl lifetime used when creating the refresh-token cookie
 */
public record AuthenticationResult(
        AuthResponse response,
        String refreshToken,
        Duration refreshTokenTtl
) {
}
