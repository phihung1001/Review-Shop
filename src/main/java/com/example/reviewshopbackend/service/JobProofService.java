package com.example.reviewshopbackend.service;

import java.util.List;

import com.example.reviewshopbackend.dto.request.RejectJobProofRequest;
import com.example.reviewshopbackend.dto.request.SubmitJobProofRequest;
import com.example.reviewshopbackend.dto.response.FreelancerOpenJobResponse;
import com.example.reviewshopbackend.dto.response.JobProofResponse;

public interface JobProofService {
    List<FreelancerOpenJobResponse> findOpenJobs(String freelancerEmail);

    JobProofResponse submit(Long jobId, SubmitJobProofRequest request, String freelancerEmail);

    List<JobProofResponse> findFreelancerProofs(String freelancerEmail);

    List<JobProofResponse> findClientProofs(String clientEmail);

    List<JobProofResponse> findClientProofHistory(String clientEmail);

    JobProofResponse findClientProofHistoryDetail(Long proofId, String clientEmail);

    JobProofResponse findClientProof(Long proofId, String clientEmail);

    JobProofResponse approve(Long proofId, String clientEmail);

    JobProofResponse reject(Long proofId, RejectJobProofRequest request, String clientEmail);
}
