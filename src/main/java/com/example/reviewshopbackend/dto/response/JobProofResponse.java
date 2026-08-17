package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.reviewshopbackend.entity.JobProof;
import com.example.reviewshopbackend.entity.ProofStatus;

public record JobProofResponse(
        Long id,
        Long assignmentId,
        Long jobId,
        String jobTitle,
        Long freelancerId,
        String freelancerName,
        Integer reviewContentIndex,
        String reviewContent,
        String shareLink,
        List<String> proofImages,
        ProofStatus status,
        String rejectionReason,
        BigDecimal payoutAmount,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static JobProofResponse from(JobProof proof) {
        return from(proof, proof.getProofImages());
    }

    public static JobProofResponse from(JobProof proof, List<String> proofImages) {
        return new JobProofResponse(
                proof.getId(),
                proof.getAssignment().getId(),
                proof.getJob().getId(),
                proof.getJob().getTitle(),
                proof.getFreelancer().getId(),
                proof.getFreelancer().getFullName(),
                proof.getReviewContentIndex(),
                proof.getReviewContentSnapshot(),
                proof.getShareLink(),
                proofImages,
                proof.getStatus(),
                proof.getRejectionReason(),
                proof.getPayoutAmount(),
                proof.getReviewedAt(),
                proof.getCreatedAt(),
                proof.getUpdatedAt()
        );
    }
}
