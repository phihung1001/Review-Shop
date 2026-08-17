package com.example.reviewshopbackend.service.impl;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.example.reviewshopbackend.config.R2StorageProperties;
import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.ProofImageStorageService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class ProofImageStorageServiceImpl implements ProofImageStorageService {
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp"
    );

    private final S3Presigner presigner;
    private final R2StorageProperties properties;
    private final UserRepository userRepository;
    private final Clock clock;

    @Autowired
    public ProofImageStorageServiceImpl(S3Presigner presigner, R2StorageProperties properties,
                                        UserRepository userRepository) {
        this(presigner, properties, userRepository, Clock.systemUTC());
    }

    ProofImageStorageServiceImpl(S3Presigner presigner, R2StorageProperties properties,
                                 UserRepository userRepository, Clock clock) {
        this.presigner = presigner;
        this.properties = properties;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Override
    public ImageUploadResponse createUpload(CreateImageUploadRequest request, String freelancerEmail) {
        User freelancer = userRepository.findByEmail(freelancerEmail.trim().toLowerCase(Locale.ROOT))
                .filter(user -> user.getRole() == UserRole.FREELANCER)
                .orElseThrow(() -> new AccessDeniedException("Freelancer not found"));
        String contentType = request.contentType().trim().toLowerCase(Locale.ROOT);
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new IllegalArgumentException("Only JPEG, PNG and WebP images are supported");
        }
        if (request.fileSize() > properties.maxImageSize()) {
            throw new IllegalArgumentException("Image exceeds the maximum allowed size");
        }
        String key = "proofs/" + freelancer.getId() + "/" + UUID.randomUUID() + extension;
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(properties.bucket()).key(key).contentType(contentType).contentLength(request.fileSize()).build();
        var signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(properties.uploadUrlDuration()).putObjectRequest(put).build());
        return new ImageUploadResponse(key, signed.url().toString(),
                Map.of("Content-Type", contentType, "Content-Length", Long.toString(request.fileSize())),
                Instant.now(clock).plus(properties.uploadUrlDuration()));
    }

    @Override
    public String requireOwnedObjectKey(String value, Long freelancerId) {
        String key = value.trim();
        if (key.startsWith("https://")) {
            return key;
        }
        if (!key.startsWith("proofs/" + freelancerId + "/") || key.contains("..")) {
            throw new IllegalArgumentException("Proof image does not belong to the authenticated freelancer");
        }
        return key;
    }

    @Override
    public String createDownloadUrl(String value) {
        if (value.startsWith("https://")) {
            return value;
        }
        GetObjectRequest get = GetObjectRequest.builder().bucket(properties.bucket()).key(value).build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(properties.downloadUrlDuration()).getObjectRequest(get).build()).url().toString();
    }
}
