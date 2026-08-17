package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.ReviewContent;

public record JobResponse(
        Long id,
        String title,
        String description,
        String mapLink,
        RequiredLevelResponse requiredLevel,
        BigDecimal pricePerReview,
        Integer requiredReviews,
        List<ReviewContent> reviewContents,
        // Legacy response fields kept for existing clients.
        String linkUrlMap,
        BigDecimal pricePerTask,
        Integer totalSlots,
        Integer availableSlots,
        Integer completedSlots,
        JobStatus status
) {
    public static JobResponse from(Job job) {
        return new JobResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getMapLink(),
                RequiredLevelResponse.from(job.getRequiredLevel()),
                job.getPricePerReview(),
                job.getTotalReviews(),
                job.getReviewContents(),
                job.getMapLink(),
                job.getPricePerTask(),
                job.getTotalReviews(),
                job.getAvailableSlots(),
                job.getCompletedSlots(),
                job.getStatus()
        );
    }
}
