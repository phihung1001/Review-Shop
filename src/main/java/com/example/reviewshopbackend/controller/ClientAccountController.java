package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.Locale;

import com.example.reviewshopbackend.dto.request.CreateDepositRequest;
import com.example.reviewshopbackend.dto.response.AccountBalanceResponse;
import com.example.reviewshopbackend.dto.response.DepositOrderResponse;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.service.DepositService;
import com.example.reviewshopbackend.service.SepayDepositService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/client/account")
@PreAuthorize("hasRole('CLIENT')")
public class ClientAccountController {
    private final UserRepository userRepository;
    private final AccountBalanceService accountBalanceService;
    private final DepositService depositService;
    private final SepayDepositService sepayDepositService;

    public ClientAccountController(
            UserRepository userRepository,
            AccountBalanceService accountBalanceService,
            DepositService depositService,
            SepayDepositService sepayDepositService
    ) {
        this.userRepository = userRepository;
        this.accountBalanceService = accountBalanceService;
        this.depositService = depositService;
        this.sepayDepositService = sepayDepositService;
    }

    @GetMapping
    public ResponseEntity<AccountBalanceResponse> getBalance(Principal principal) {
        User user = userRepository.findByEmail(principal.getName().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        return ResponseEntity.ok(AccountBalanceResponse.from(accountBalanceService.getOrCreate(user)));
    }

    @PostMapping("/deposits")
    public ResponseEntity<DepositOrderResponse> createDeposit(
            @Valid @RequestBody CreateDepositRequest request,
            Principal principal
    ) {
        if ("SEPAY".equalsIgnoreCase(request.provider().trim())) {
            var deposit = sepayDepositService.create(
                    principal.getName(), request.amount(), request.idempotencyKey());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(DepositOrderResponse.from(deposit, sepayDepositService.paymentDetails(deposit)));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(DepositOrderResponse.from(depositService.create(
                principal.getName(),
                request.amount(),
                request.provider(),
                request.idempotencyKey()
        )));
    }
}
