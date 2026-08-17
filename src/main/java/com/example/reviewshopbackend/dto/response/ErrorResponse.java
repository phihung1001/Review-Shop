package com.example.reviewshopbackend.dto.response;

public record ErrorResponse(
        int status,
        String error,
        String message
) {
}
