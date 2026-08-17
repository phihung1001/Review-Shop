package com.example.reviewshopbackend.service;

public interface SerpApiContributorClient {
    ContributorProfile fetch(String contributorId);

    record ContributorProfile(
            String name, String thumbnail, Integer points, Integer level,
            Boolean localGuide, Integer reviewCount
    ) {}
}
