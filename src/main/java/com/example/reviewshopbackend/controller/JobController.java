package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.dto.response.JobResponse;
import com.example.reviewshopbackend.service.JobService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {
    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<JobResponse> create(
            @Valid @RequestBody CreateJobRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobService.create(request, principal.getName(), idempotencyKey));
    }

    @GetMapping
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<JobResponse>> findMine(Principal principal) {
        return ResponseEntity.ok(jobService.findMine(principal.getName()));
    }

    @GetMapping("/{jobId}")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<JobResponse> findMineById(@PathVariable Long jobId, Principal principal) {
        return ResponseEntity.ok(jobService.findMineById(jobId, principal.getName()));
    }
}
