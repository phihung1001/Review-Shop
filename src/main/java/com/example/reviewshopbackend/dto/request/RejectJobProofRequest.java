package com.example.reviewshopbackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectJobProofRequest(
        @NotBlank @Size(max = 2000) String reason
) {
}
