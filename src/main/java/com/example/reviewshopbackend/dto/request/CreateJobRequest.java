package com.example.reviewshopbackend.dto.request;

import java.math.BigDecimal;
import java.util.List;

import com.example.reviewshopbackend.entity.ReviewContent;
import com.example.reviewshopbackend.validator.job.GoogleMapsUrl;
import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateJobRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank String description,
        @JsonAlias("linkUrlMap") @NotBlank @Size(max = 2048) @GoogleMapsUrl String mapLink,
        @NotNull @Positive Long requiredLevelId,
        @NotNull
        @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 17, fraction = 2)
        BigDecimal pricePerReview,
        @JsonAlias("totalSlots") @NotNull @Min(1) Integer totalReviews,
        List<ReviewContent> reviewContents
) {
}
