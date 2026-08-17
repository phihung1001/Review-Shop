package com.example.reviewshopbackend.service.impl;

import java.time.*;
import java.util.*;
import com.example.reviewshopbackend.config.R2StorageProperties;
import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;
import com.example.reviewshopbackend.entity.*;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.PayoutMethodImageStorageService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;

@Service
public class PayoutMethodImageStorageServiceImpl implements PayoutMethodImageStorageService {
    private static final Map<String,String> EXTENSIONS = Map.of("image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");
    private final S3Presigner presigner; private final R2StorageProperties properties; private final UserRepository users;
    public PayoutMethodImageStorageServiceImpl(S3Presigner presigner, R2StorageProperties properties, UserRepository users) {
        this.presigner = presigner; this.properties = properties; this.users = users;
    }
    public ImageUploadResponse createUpload(CreateImageUploadRequest request, String email) {
        User user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(u -> u.getRole() == UserRole.FREELANCER)
                .orElseThrow(() -> new AccessDeniedException("Freelancer not found"));
        String type = request.contentType().trim().toLowerCase(Locale.ROOT); String extension = EXTENSIONS.get(type);
        if (extension == null) throw new IllegalArgumentException("Only JPEG, PNG and WebP images are supported");
        if (request.fileSize() > properties.maxImageSize()) throw new IllegalArgumentException("Image exceeds the maximum allowed size");
        String key = "payout-methods/" + user.getId() + "/" + UUID.randomUUID() + extension;
        PutObjectRequest put = PutObjectRequest.builder().bucket(properties.bucket()).key(key).contentType(type).contentLength(request.fileSize()).build();
        var signed = presigner.presignPutObject(PutObjectPresignRequest.builder().signatureDuration(properties.uploadUrlDuration()).putObjectRequest(put).build());
        return new ImageUploadResponse(key, signed.url().toString(), Map.of("Content-Type", type, "Content-Length", Long.toString(request.fileSize())), Instant.now().plus(properties.uploadUrlDuration()));
    }
    public String requireOwnedObjectKey(String value, Long freelancerId) {
        String key = value.trim();
        if (!key.startsWith("payout-methods/" + freelancerId + "/") || key.contains(".."))
            throw new IllegalArgumentException("Payout QR image does not belong to the authenticated freelancer");
        return key;
    }
    public String createDownloadUrl(String key) {
        if (key == null) return null;
        GetObjectRequest get = GetObjectRequest.builder().bucket(properties.bucket()).key(key).build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder().signatureDuration(properties.downloadUrlDuration()).getObjectRequest(get).build()).url().toString();
    }
}
