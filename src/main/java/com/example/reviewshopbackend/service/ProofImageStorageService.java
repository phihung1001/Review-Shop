package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;

public interface ProofImageStorageService {
    ImageUploadResponse createUpload(CreateImageUploadRequest request, String freelancerEmail);

    String requireOwnedObjectKey(String value, Long freelancerId);

    String createDownloadUrl(String value);
}
