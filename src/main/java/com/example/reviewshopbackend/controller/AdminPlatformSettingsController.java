package com.example.reviewshopbackend.controller;

import java.security.Principal;

import com.example.reviewshopbackend.dto.request.UpdatePlatformFeeRequest;
import com.example.reviewshopbackend.dto.request.UpdateWithdrawalSettingsRequest;
import com.example.reviewshopbackend.dto.response.PlatformSettingsResponse;
import com.example.reviewshopbackend.service.PlatformSettingsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/admin/platform-settings")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPlatformSettingsController {
    private final PlatformSettingsService platformSettingsService;

    public AdminPlatformSettingsController(PlatformSettingsService platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }

    @GetMapping
    public ResponseEntity<PlatformSettingsResponse> getSettings() {
        return ResponseEntity.ok(platformSettingsService.getSettings());
    }

    @PutMapping("/fee-rate")
    public ResponseEntity<PlatformSettingsResponse> updateFeeRate(
            @Valid @RequestBody UpdatePlatformFeeRequest request,
            Principal principal
    ) {
        return ResponseEntity.ok(
                platformSettingsService.updatePlatformFeeRate(request.platformFeeRate(), principal.getName())
        );
    }

    @PutMapping("/withdrawals")
    public ResponseEntity<PlatformSettingsResponse> updateWithdrawals(
            @Valid @RequestBody UpdateWithdrawalSettingsRequest request, Principal principal) {
        return ResponseEntity.ok(platformSettingsService.updateWithdrawalSettings(request.enabled(),
                request.minimumAmount(), request.feeType(), request.feeValue(), principal.getName()));
    }
}
