package com.example.reviewshopbackend.service;

import java.util.List;

import com.example.reviewshopbackend.dto.request.ClaimJobRequest;
import com.example.reviewshopbackend.dto.response.ClaimJobResponse;
import com.example.reviewshopbackend.dto.response.JobAssignmentSummaryResponse;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.User;

public interface JobAssignmentService {
    ClaimJobResponse claim(Long jobId, ClaimJobRequest request, String freelancerEmail);

    List<JobAssignmentSummaryResponse> findMine(String freelancerEmail);

    ClaimJobResponse findMineById(Long assignmentId, String freelancerEmail);

    void cancel(Long assignmentId, String freelancerEmail);

    JobAssignment requireClaimedForSubmit(Long assignmentId, Long jobId, User freelancer);

    void expireAssignments();
}
