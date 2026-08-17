package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;

import com.example.reviewshopbackend.dto.request.SubmitJobProofRequest;
import com.example.reviewshopbackend.dto.response.FreelancerOpenJobResponse;
import com.example.reviewshopbackend.dto.response.JobProofResponse;
import com.example.reviewshopbackend.service.JobProofService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer")
public class FreelancerJobController {
    private final JobProofService service;

    public FreelancerJobController(JobProofService service) {
        this.service = service;
    }

    @GetMapping("/jobs/open")
    public ResponseEntity<List<FreelancerOpenJobResponse>> findOpenJobs(Principal principal) {
        return ResponseEntity.ok(service.findOpenJobs(principal.getName()));
    }

    @PostMapping("/jobs/{jobId}/proofs")
    @PreAuthorize("hasRole('FREELANCER')")
    public ResponseEntity<JobProofResponse> submit(
            @PathVariable Long jobId,
            @Valid @RequestBody SubmitJobProofRequest request,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.submit(jobId, request, principal.getName()));
    }

    @GetMapping("/proofs")
    @PreAuthorize("hasRole('FREELANCER')")
    public ResponseEntity<List<JobProofResponse>> findMyProofs(Principal principal) {
        return ResponseEntity.ok(service.findFreelancerProofs(principal.getName()));
    }
}
