package com.example.reviewshopbackend.dto.request;

import com.example.reviewshopbackend.entity.GoogleMapsAccountType;
import jakarta.validation.constraints.NotNull;

public record UpdateGoogleMapsAccountTypeRequest(@NotNull GoogleMapsAccountType accountType) {}
