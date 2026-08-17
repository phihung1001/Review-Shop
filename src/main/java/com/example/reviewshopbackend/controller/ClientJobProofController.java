package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;

import com.example.reviewshopbackend.dto.request.RejectJobProofRequest;
import com.example.reviewshopbackend.dto.response.JobProofResponse;
import com.example.reviewshopbackend.service.JobProofService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/client/proofs")
@PreAuthorize("hasRole('CLIENT')")
public class ClientJobProofController {
    private final JobProofService service;

    public ClientJobProofController(JobProofService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<JobProofResponse>> findProofs(Principal principal) {
        return ResponseEntity.ok(service.findClientProofs(principal.getName()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<JobProofResponse>> findProofHistory(Principal principal) {
        return ResponseEntity.ok(service.findClientProofHistory(principal.getName()));
    }

    @GetMapping("/history/{proofId}")
    public ResponseEntity<JobProofResponse> findProofHistoryDetail(
            @PathVariable Long proofId,
            Principal principal
    ) {
        return ResponseEntity.ok(service.findClientProofHistoryDetail(proofId, principal.getName()));
    }

    @GetMapping("/{proofId}")
    public ResponseEntity<JobProofResponse> findProof(
            @PathVariable Long proofId,
            Principal principal
    ) {
        return ResponseEntity.ok(service.findClientProof(proofId, principal.getName()));
    }

    @PostMapping("/{proofId}/approve")
    public ResponseEntity<JobProofResponse> approve(@PathVariable Long proofId, Principal principal) {
        return ResponseEntity.ok(service.approve(proofId, principal.getName()));
    }

    @PostMapping("/{proofId}/reject")
    public ResponseEntity<JobProofResponse> reject(
            @PathVariable Long proofId,
            @Valid @RequestBody RejectJobProofRequest request,
            Principal principal
    ) {
        return ResponseEntity.ok(service.reject(proofId, request, principal.getName()));
    }
}
