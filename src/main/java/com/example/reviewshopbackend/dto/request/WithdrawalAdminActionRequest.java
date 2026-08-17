package com.example.reviewshopbackend.dto.request;

import jakarta.validation.constraints.Size;

public record WithdrawalAdminActionRequest(
        @Size(max = 1000) String reason,
        @Size(max = 40) String provider,
        @Size(max = 120) String providerReference,
        @Size(max = 1000) String adminNote
) {}
