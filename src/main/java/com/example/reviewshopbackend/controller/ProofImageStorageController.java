package com.example.reviewshopbackend.controller;

import java.security.Principal;

import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;
import com.example.reviewshopbackend.service.ProofImageStorageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer/proof-images")
@PreAuthorize("hasRole('FREELANCER')")
public class ProofImageStorageController {
    private final ProofImageStorageService service;

    public ProofImageStorageController(ProofImageStorageService service) {
        this.service = service;
    }

    @PostMapping("/uploads")
    public ResponseEntity<ImageUploadResponse> createUpload(
            @Valid @RequestBody CreateImageUploadRequest request, Principal principal) {
        return ResponseEntity.ok(service.createUpload(request, principal.getName()));
    }
}
