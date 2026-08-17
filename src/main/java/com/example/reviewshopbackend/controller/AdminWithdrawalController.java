package com.example.reviewshopbackend.controller;

import java.security.Principal;
import com.example.reviewshopbackend.dto.request.WithdrawalAdminActionRequest;
import com.example.reviewshopbackend.dto.response.*;
import com.example.reviewshopbackend.entity.WithdrawalStatus;
import com.example.reviewshopbackend.service.WithdrawalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/withdrawals")
@PreAuthorize("hasRole('ADMIN')")
public class AdminWithdrawalController {
    private final WithdrawalService service;
    public AdminWithdrawalController(WithdrawalService service) { this.service = service; }
    @GetMapping public ResponseEntity<PageResponse<WithdrawalResponse>> findAll(@RequestParam(required = false) WithdrawalStatus status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return ResponseEntity.ok(service.findAdmin(status, page, size)); }
    @GetMapping("/{id}") public ResponseEntity<WithdrawalResponse> findById(@PathVariable Long id) { return ResponseEntity.ok(service.findAdminById(id)); }
    @PostMapping("/{id}/approve") public ResponseEntity<WithdrawalResponse> approve(@PathVariable Long id, @Valid @RequestBody WithdrawalAdminActionRequest request, Principal principal) { return ResponseEntity.ok(service.approve(id, request, principal.getName())); }
    @PostMapping("/{id}/reject") public ResponseEntity<WithdrawalResponse> reject(@PathVariable Long id, @Valid @RequestBody WithdrawalAdminActionRequest request, Principal principal) { return ResponseEntity.ok(service.reject(id, request, principal.getName())); }
    @PostMapping("/{id}/complete") public ResponseEntity<WithdrawalResponse> complete(@PathVariable Long id, @Valid @RequestBody WithdrawalAdminActionRequest request, Principal principal) { return ResponseEntity.ok(service.complete(id, request, principal.getName())); }
    @PostMapping("/{id}/fail") public ResponseEntity<WithdrawalResponse> fail(@PathVariable Long id, @Valid @RequestBody WithdrawalAdminActionRequest request, Principal principal) { return ResponseEntity.ok(service.fail(id, request, principal.getName())); }
}
