package com.example.reviewshopbackend.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SerpApiContributorClientImplTest {

    @Test
    void requestsEnglishMachineReadableSchemaAndMapsTotalReviewCount() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SerpApiContributorClientImpl client = new SerpApiContributorClientImpl(
                builder, "https://serpapi.test", "test-key");

        server.expect(queryParam("hl", "en"))
                .andExpect(queryParam("gl", "vn"))
                .andExpect(queryParam("num", "1"))
                .andRespond(withSuccess("""
                        {
                          "search_metadata": {
                            "status": "Success",
                            "json_endpoint": "https://serpapi.test/searches/result.json"
                          },
                          "search_parameters": {"engine": "google_maps_contributor_reviews"},
                          "contributor": {
                            "name": "Phi Hung Hoang",
                            "thumbnail": "https://example.com/avatar.jpg",
                            "points": 96,
                            "level": 3,
                            "local_guide": true,
                            "contributions": {"reviews": 8, "photos": 1}
                          },
                          "reviews": [{
                            "review_id": "review-1",
                            "rating": 5,
                            "place_info": {"title": "Example place"}
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        var profile = client.fetch("117642509766343273456");

        assertEquals(3, profile.level());
        assertEquals(8, profile.reviewCount());
        server.verify();
    }

    @Test
    void usesReturnedReviewAsFallbackWhenContributionTotalIsMissingOrLocalized() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SerpApiContributorClientImpl client = new SerpApiContributorClientImpl(
                builder, "https://serpapi.test", "test-key");

        server.expect(queryParam("hl", "en"))
                .andRespond(withSuccess("""
                        {
                          "search_metadata": {"status": "Success"},
                          "contributor": {
                            "name": "Local Guide",
                            "points": 10,
                            "level": 1,
                            "local_guide": true,
                            "contributions": {"bài_đánh_giá": 8}
                          },
                          "reviews": [{"review_id": "review-1"}]
                        }
                        """, MediaType.APPLICATION_JSON));

        var profile = client.fetch("117642509766343273456");

        assertEquals(1, profile.reviewCount());
        server.verify();
    }
}
