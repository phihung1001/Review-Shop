package com.example.reviewshopbackend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SepayProperties.class)
public class SepayConfig {
}
