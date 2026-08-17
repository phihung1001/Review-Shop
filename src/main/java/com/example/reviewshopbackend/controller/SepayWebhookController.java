package com.example.reviewshopbackend.controller;

import com.example.reviewshopbackend.dto.request.SepayWebhookRequest;
import com.example.reviewshopbackend.dto.response.SepayWebhookResponse;
import com.example.reviewshopbackend.service.SepayDepositService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/sepay")
public class SepayWebhookController {
    private final SepayDepositService sepayDepositService;

    public SepayWebhookController(SepayDepositService sepayDepositService) {
        this.sepayDepositService = sepayDepositService;
    }

    @PostMapping
    public ResponseEntity<SepayWebhookResponse> receive(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody SepayWebhookRequest request
    ) {
        sepayDepositService.handleWebhook(request, authorizationHeader);
        return ResponseEntity.ok(new SepayWebhookResponse(true));
    }
}
