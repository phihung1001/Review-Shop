package com.example.reviewshopbackend.service.impl;

import java.util.List;

import com.example.reviewshopbackend.exception.GoogleMapsVerificationUnavailableException;
import com.example.reviewshopbackend.service.SerpApiContributorClient;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class SerpApiContributorClientImpl implements SerpApiContributorClient {
    private final RestClient restClient;
    private final String apiKey;

    public SerpApiContributorClientImpl(
            RestClient.Builder builder,
            @Value("${app.serpapi.base-url:https://serpapi.com}") String baseUrl,
            @Value("${app.serpapi.api-key:}") String apiKey
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    @Override
    public ContributorProfile fetch(String contributorId) {
        if (apiKey.isBlank()) {
            throw new GoogleMapsVerificationUnavailableException("SerpApi API key is not configured");
        }
        try {
            SerpResponse response = restClient.get().uri(uri -> uri.path("/search.json")
                            .queryParam("engine", "google_maps_contributor_reviews")
                            .queryParam("contributor_id", contributorId)
                            // Stabilize machine-readable field names. This does not restrict the
                            // contributor's language or country; it only controls response localization.
                            .queryParam("hl", "en").queryParam("gl", "vn")
                            .queryParam("num", 1).queryParam("api_key", apiKey).build())
                    .retrieve().body(SerpResponse.class);
            if (response == null || response.contributor() == null
                    || response.searchMetadata() == null
                    || !"Success".equalsIgnoreCase(response.searchMetadata().status())) {
                throw new GoogleMapsVerificationUnavailableException("SerpApi returned no contributor data");
            }
            Contributor contributor = response.contributor();
            int returnedReviews = response.reviews() == null ? 0 : response.reviews().size();
            int reviews = contributor.contributions() == null || contributor.contributions().reviews() == null
                    ? returnedReviews : contributor.contributions().reviews();
            return new ContributorProfile(contributor.name(), contributor.thumbnail(), contributor.points(),
                    contributor.level(), contributor.localGuide(), reviews);
        } catch (RestClientException exception) {
            throw new GoogleMapsVerificationUnavailableException("Unable to verify Google Maps account");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SerpResponse(
            @JsonProperty("search_metadata") SearchMetadata searchMetadata,
            Contributor contributor,
            List<Review> reviews
    ) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SearchMetadata(String status) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Contributor(
            String name, String thumbnail, Integer points, Integer level,
            @JsonProperty("local_guide") Boolean localGuide, Contributions contributions) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Contributions(Integer reviews) {}
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Review(@JsonProperty("review_id") String reviewId) {}
}
