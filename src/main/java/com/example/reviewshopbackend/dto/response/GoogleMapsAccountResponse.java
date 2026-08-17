package com.example.reviewshopbackend.dto.response;

import java.time.Instant;

import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.GoogleMapsAccountType;

public record GoogleMapsAccountResponse(
        Long id, String contributorId, String profileUrl, String accountName, String thumbnail,
        Integer localGuideLevel, Integer points, Integer reviewCount,
        GoogleMapsAccountType accountType, boolean readyForJobs, Instant verifiedAt
) {
    public static GoogleMapsAccountResponse from(GoogleMapsAccount account) {
        return new GoogleMapsAccountResponse(
                account.getId(), account.getContributorId(), account.getProfileUrl(),
                account.getAccountName(), account.getThumbnail(), account.getLocalGuideLevel(),
                account.getPoints(), account.getReviewCount(), account.getAccountType(),
                account.isActive() && account.getAccountType() != null, account.getVerifiedAt());
    }
}
