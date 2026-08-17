package com.example.reviewshopbackend.entity;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum JobStatus {
    OPEN,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    @JsonCreator
    public static JobStatus fromValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim()
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);
        if ("INPROGRESS".equals(normalized) || "INPRORESS".equals(normalized)) {
            return IN_PROGRESS;
        }
        return JobStatus.valueOf(normalized);
    }
}
