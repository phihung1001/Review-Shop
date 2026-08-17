package com.example.reviewshopbackend.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

public record SubmitJobProofRequest(
        Long assignmentId,
        @Size(max = 2048) @URL(protocol = "https") String shareLink,
        @NotEmpty @Size(max = 10)
        List<@NotBlank @Size(max = 2048) String> proofImages
) {
}
