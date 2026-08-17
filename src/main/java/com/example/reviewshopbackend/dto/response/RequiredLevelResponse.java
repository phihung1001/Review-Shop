package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.RequiredLevel;

public record RequiredLevelResponse(
        Long id,
        String description,
        BigDecimal pricePerReview,
        Integer rank
) {
    public static RequiredLevelResponse from(RequiredLevel requiredLevel) {
        return new RequiredLevelResponse(
                requiredLevel.getId(),
                requiredLevel.getDescription(),
                requiredLevel.getPricePerReview(),
                requiredLevel.getRank()
        );
    }
}
