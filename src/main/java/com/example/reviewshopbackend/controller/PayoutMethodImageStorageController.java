package com.example.reviewshopbackend.controller;

import java.security.Principal;
import com.example.reviewshopbackend.dto.request.CreateImageUploadRequest;
import com.example.reviewshopbackend.dto.response.ImageUploadResponse;
import com.example.reviewshopbackend.service.PayoutMethodImageStorageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/freelancer/payout-method-images")
@PreAuthorize("hasRole('FREELANCER')")
public class PayoutMethodImageStorageController {
    private final PayoutMethodImageStorageService service;
    public PayoutMethodImageStorageController(PayoutMethodImageStorageService service) { this.service = service; }
    @PostMapping("/uploads") public ResponseEntity<ImageUploadResponse> create(@Valid @RequestBody CreateImageUploadRequest request, Principal principal) { return ResponseEntity.ok(service.createUpload(request, principal.getName())); }
}
