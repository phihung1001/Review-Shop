package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.JobAssignment;

public record JobAssignmentSummaryResponse(
        Long id,
        Long jobId,
        String jobTitle,
        BigDecimal payoutPerTask,
        String googleMapsAccountName,
        AssignmentStatus status,
        Instant expiresAt,
        Instant submittedAt,
        Instant finishedAt,
        Instant createdAt
) {
    public static JobAssignmentSummaryResponse from(JobAssignment assignment) {
        return new JobAssignmentSummaryResponse(
                assignment.getId(),
                assignment.getJob().getId(),
                assignment.getJob().getTitle(),
                assignment.getJob().getPricePerTask(),
                assignment.getGoogleMapsAccountName(),
                assignment.getStatus(),
                assignment.getExpiresAt(),
                assignment.getSubmittedAt(),
                assignment.getFinishedAt(),
                assignment.getCreatedAt()
        );
    }
}
