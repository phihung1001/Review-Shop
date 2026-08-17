package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;

public interface PayoutMethodImageStorageService {
    ImageUploadResponse createUpload(CreateImageUploadRequest request, String email);
    String requireOwnedObjectKey(String key, Long freelancerId);
    String createDownloadUrl(String key);
}
