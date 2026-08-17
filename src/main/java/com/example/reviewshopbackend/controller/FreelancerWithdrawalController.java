package com.example.reviewshopbackend.controller;

import java.security.Principal;
import com.example.reviewshopbackend.dto.request.CreateWithdrawalRequest;
import com.example.reviewshopbackend.dto.response.*;
import com.example.reviewshopbackend.entity.WithdrawalStatus;
import com.example.reviewshopbackend.service.WithdrawalService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/freelancer/withdrawals")
@PreAuthorize("hasRole('FREELANCER')")
public class FreelancerWithdrawalController {
    private final WithdrawalService service;
    public FreelancerWithdrawalController(WithdrawalService service) { this.service = service; }
    @PostMapping public ResponseEntity<WithdrawalResponse> create(@Valid @RequestBody CreateWithdrawalRequest request, @RequestHeader("Idempotency-Key") String key, Principal principal) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, key, principal.getName())); }
    @GetMapping public ResponseEntity<PageResponse<WithdrawalResponse>> findAll(@RequestParam(required = false) WithdrawalStatus status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, Principal principal) { return ResponseEntity.ok(service.findMine(principal.getName(), status, page, size)); }
    @GetMapping("/{id}") public ResponseEntity<WithdrawalResponse> findById(@PathVariable Long id, Principal principal) { return ResponseEntity.ok(service.findMineById(id, principal.getName())); }
    @PostMapping("/{id}/cancel") public ResponseEntity<WithdrawalResponse> cancel(@PathVariable Long id, Principal principal) { return ResponseEntity.ok(service.cancel(id, principal.getName())); }
}
