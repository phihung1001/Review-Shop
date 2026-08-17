package com.example.reviewshopbackend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VerifyGoogleMapsAccountRequest(@NotBlank String profileUrl) {}
