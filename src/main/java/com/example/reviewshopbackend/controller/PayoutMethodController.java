package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.List;
import com.example.reviewshopbackend.dto.request.CreatePayoutMethodRequest;
import com.example.reviewshopbackend.dto.response.PayoutMethodResponse;
import com.example.reviewshopbackend.service.PayoutMethodService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/freelancer/payout-methods")
@PreAuthorize("hasRole('FREELANCER')")
public class PayoutMethodController {
    private final PayoutMethodService service;
    public PayoutMethodController(PayoutMethodService service) { this.service = service; }
    @PostMapping
    public ResponseEntity<PayoutMethodResponse> create(@Valid @RequestBody CreatePayoutMethodRequest request, Principal principal)
    {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, principal.getName()));
    }
    @GetMapping
    public ResponseEntity<List<PayoutMethodResponse>> findAll(Principal principal) {
        return ResponseEntity.ok(service.findAll(principal.getName()));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id, Principal principal) {
        service.deactivate(id, principal.getName()); return ResponseEntity.noContent().build();
    }
}
