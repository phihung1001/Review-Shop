package com.example.reviewshopbackend.dto.response;

public record AuthResponse(
        String message,
        String accessToken,
        String tokenType,
        long expiresIn,
        UserResponse user
) {
}
