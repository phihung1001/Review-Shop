package com.example.reviewshopbackend.config;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.storage.r2")
public record R2StorageProperties(
        URI endpoint,
        String accessKey,
        String secretKey,
        String bucket,
        String region,
        Duration uploadUrlDuration,
        Duration downloadUrlDuration,
        long maxImageSize
) {
}
