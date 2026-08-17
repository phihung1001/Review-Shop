package com.example.reviewshopbackend.dto.request;

import jakarta.validation.constraints.NotNull;

public record ClaimJobRequest(Integer reviewContentIndex, @NotNull Long googleMapsAccountId) {
}
