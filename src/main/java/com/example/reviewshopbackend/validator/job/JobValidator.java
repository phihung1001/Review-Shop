package com.example.reviewshopbackend.validator.job;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;

public interface JobValidator {
    JobCreationValidation validate(CreateJobRequest request, String clientEmail);
}
