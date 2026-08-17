package com.example.reviewshopbackend.dto.response;

import java.util.List;

import com.example.reviewshopbackend.entity.ReviewContent;

public record JobReviewContentResponse(
        int index,
        String content,
        List<String> images,
        boolean available
) {
    public static JobReviewContentResponse from(int index, ReviewContent reviewContent, boolean available) {
        return new JobReviewContentResponse(index, reviewContent.content(), reviewContent.images(), available);
    }
}
