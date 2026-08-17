package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.dto.response.JobResponse;

import java.util.List;

/**
 * Coordinates client-owned review job operations.
 */
public interface JobService {
    /**
     * Validates pricing and ownership, calculates platform budgets, and persists a new job.
     *
     * @param request validated job data
     * @param clientEmail authenticated client's email from the JWT subject
     * @param idempotencyKey client-scoped key identifying one logical create request
     * @return the created job
     */
    JobResponse create(CreateJobRequest request, String clientEmail, String idempotencyKey);

    /** Returns the authenticated client's jobs, newest first. */
    List<JobResponse> findMine(String clientEmail);

    /** Returns one job only when it belongs to the authenticated client. */
    JobResponse findMineById(Long jobId, String clientEmail);
}
