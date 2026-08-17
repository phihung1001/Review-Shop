package com.example.reviewshopbackend.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.example.reviewshopbackend.entity.Job;

public record FreelancerOpenJobResponse(
        Long id,
        String title,
        String description,
        String mapLink,
        RequiredLevelResponse requiredLevel,
        BigDecimal payoutPerTask,
        Integer availableSlots,
        Integer totalSlots,
        List<JobReviewContentResponse> reviewContents
) {
    public static FreelancerOpenJobResponse from(Job job, List<JobReviewContentResponse> reviewContents) {
        return new FreelancerOpenJobResponse(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getMapLink(),
                RequiredLevelResponse.from(job.getRequiredLevel()),
                job.getPricePerTask(),
                job.getAvailableSlots(),
                job.getTotalReviews(),
                reviewContents
        );
    }
}
