package com.example.reviewshopbackend.service;

import java.util.List;
import com.example.reviewshopbackend.dto.response.GoogleMapsAccountResponse;
import com.example.reviewshopbackend.entity.GoogleMapsAccountType;

public interface GoogleMapsAccountService {
    GoogleMapsAccountResponse verify(String profileUrl, String freelancerEmail);
    GoogleMapsAccountResponse updateType(Long id, GoogleMapsAccountType type, String freelancerEmail);
    List<GoogleMapsAccountResponse> findMine(String freelancerEmail);
    List<GoogleMapsAccountResponse> findEligibleForJob(Long jobId, String freelancerEmail);
}
