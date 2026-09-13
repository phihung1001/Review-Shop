package com.example.reviewshopbackend.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateImageUploadRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank String contentType,
        @JsonAlias("fileSize") @Positive long size
) {
}
