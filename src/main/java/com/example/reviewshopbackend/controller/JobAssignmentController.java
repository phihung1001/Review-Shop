package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;

import com.example.reviewshopbackend.dto.request.ClaimJobRequest;
import com.example.reviewshopbackend.dto.response.ClaimJobResponse;
import com.example.reviewshopbackend.dto.response.JobAssignmentSummaryResponse;
import com.example.reviewshopbackend.dto.response.GoogleMapsAccountResponse;
import com.example.reviewshopbackend.service.JobAssignmentService;
import com.example.reviewshopbackend.service.GoogleMapsAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer")
@PreAuthorize("hasRole('FREELANCER')")
public class JobAssignmentController {
    private final JobAssignmentService service;
    private final GoogleMapsAccountService googleMapsAccountService;

    public JobAssignmentController(JobAssignmentService service, GoogleMapsAccountService googleMapsAccountService) {
        this.service = service;
        this.googleMapsAccountService = googleMapsAccountService;
    }

    @PostMapping("/jobs/{jobId}/assignments")
    public ResponseEntity<ClaimJobResponse> claim(
            @PathVariable Long jobId,
            @Valid @RequestBody ClaimJobRequest request,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.claim(jobId, request, principal.getName()));
    }

    @GetMapping("/jobs/{jobId}/eligible-google-maps-accounts")
    public ResponseEntity<List<GoogleMapsAccountResponse>> findEligibleAccounts(
            @PathVariable Long jobId,
            Principal principal
    ) {
        return ResponseEntity.ok(googleMapsAccountService.findEligibleForJob(jobId, principal.getName()));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<JobAssignmentSummaryResponse>> findMine(Principal principal) {
        return ResponseEntity.ok(service.findMine(principal.getName()));
    }

    @GetMapping("/assignments/{assignmentId}")
    public ResponseEntity<ClaimJobResponse> findMineById(
            @PathVariable Long assignmentId,
            Principal principal
    ) {
        return ResponseEntity.ok(service.findMineById(assignmentId, principal.getName()));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> cancel(@PathVariable Long assignmentId, Principal principal) {
        service.cancel(assignmentId, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
