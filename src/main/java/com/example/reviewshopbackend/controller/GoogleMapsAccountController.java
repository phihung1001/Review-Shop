package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;
import com.example.reviewshopbackend.dto.request.UpdateGoogleMapsAccountTypeRequest;
import com.example.reviewshopbackend.dto.request.VerifyGoogleMapsAccountRequest;
import com.example.reviewshopbackend.dto.response.GoogleMapsAccountResponse;
import com.example.reviewshopbackend.service.GoogleMapsAccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/freelancer/google-maps-accounts")
@PreAuthorize("hasRole('FREELANCER')")
public class GoogleMapsAccountController {
    private final GoogleMapsAccountService service;
    public GoogleMapsAccountController(GoogleMapsAccountService service) { this.service = service; }

    @PostMapping("/verify")
    public ResponseEntity<GoogleMapsAccountResponse> verify(
            @Valid @RequestBody VerifyGoogleMapsAccountRequest request,
            Principal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.verify(request.profileUrl(), principal.getName()));
    }

    @PatchMapping("/{id}/type")
    public ResponseEntity<GoogleMapsAccountResponse> updateType(@PathVariable Long id,
            @Valid @RequestBody UpdateGoogleMapsAccountTypeRequest request, Principal principal) {
        return ResponseEntity.ok(service.updateType(id, request.accountType(), principal.getName()));
    }

    @GetMapping
    public ResponseEntity<List<GoogleMapsAccountResponse>> findMine(Principal principal) {
        return ResponseEntity.ok(service.findMine(principal.getName()));
    }
}
