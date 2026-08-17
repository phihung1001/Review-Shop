package com.example.reviewshopbackend.dto.response;

import java.time.Instant;
import java.util.Map;

public record ImageUploadResponse(
        String objectKey,
        String uploadUrl,
        Map<String, String> requiredHeaders,
        Instant expiresAt
) {
}
