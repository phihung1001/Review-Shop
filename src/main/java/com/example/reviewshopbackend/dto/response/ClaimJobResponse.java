package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.ReviewContent;

public record ClaimJobResponse(
        Long id,
        Long jobId,
        String jobTitle,
        String jobDescription,
        String mapLink,
        BigDecimal payoutPerTask,
        Integer reviewContentIndex,
        String reviewContent,
        List<String> reviewContentImages,
        Long googleMapsAccountId,
        String googleMapsAccountName,
        AssignmentStatus status,
        Instant expiresAt,
        Instant submittedAt,
        Instant finishedAt,
        Instant createdAt
) {
    public static ClaimJobResponse from(JobAssignment assignment) {
        Job job = assignment.getJob();
        ReviewContent selectedContent = selectedContent(job, assignment.getReviewContentIndex());
        return new ClaimJobResponse(
                assignment.getId(),
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getMapLink(),
                job.getPricePerTask(),
                assignment.getReviewContentIndex(),
                selectedContent == null ? null : selectedContent.content(),
                selectedContent == null ? List.of() : selectedContent.images(),
                assignment.getGoogleMapsAccount() == null ? null : assignment.getGoogleMapsAccount().getId(),
                assignment.getGoogleMapsAccountName(),
                assignment.getStatus(),
                assignment.getExpiresAt(),
                assignment.getSubmittedAt(),
                assignment.getFinishedAt(),
                assignment.getCreatedAt()
        );
    }

    private static ReviewContent selectedContent(Job job, Integer index) {
        List<ReviewContent> contents = job.getReviewContents();
        if (index == null || contents == null || index < 0 || index >= contents.size()) {
            return null;
        }
        return contents.get(index);
    }
}
