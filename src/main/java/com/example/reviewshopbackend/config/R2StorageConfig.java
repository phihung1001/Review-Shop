package com.example.reviewshopbackend.config;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(R2StorageProperties.class)
public class R2StorageConfig {
    @Bean
    public S3Presigner r2Presigner(R2StorageProperties properties) {
        var credentials = AwsBasicCredentials.create(properties.accessKey(), properties.secretKey());
        return S3Presigner.builder()
                .endpointOverride(properties.endpoint())
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of(properties.region()))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }
}
