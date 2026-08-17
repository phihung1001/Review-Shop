package com.example.reviewshopbackend.controller;

import java.security.Principal;
import java.util.Locale;

import com.example.reviewshopbackend.dto.response.AccountBalanceResponse;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/freelancer/account")
@PreAuthorize("hasRole('FREELANCER')")
public class FreelancerAccountController {
    private final UserRepository userRepository;
    private final AccountBalanceService accountBalanceService;

    public FreelancerAccountController(
            UserRepository userRepository,
            AccountBalanceService accountBalanceService
    ) {
        this.userRepository = userRepository;
        this.accountBalanceService = accountBalanceService;
    }

    @GetMapping
    public ResponseEntity<AccountBalanceResponse> getBalance(Principal principal) {
        User user = userRepository.findByEmail(principal.getName().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        return ResponseEntity.ok(AccountBalanceResponse.from(accountBalanceService.getOrCreate(user)));
    }
}
