package com.example.reviewshopbackend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum UserRole {
    FREELANCER,
    CLIENT,
    ADMIN;

    @JsonCreator
    public static UserRole fromValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim().replace("-", "_").toUpperCase();
        if ("FRELANCER".equals(normalized)) {
            return FREELANCER;
        }
        return UserRole.valueOf(normalized);
    }
}
