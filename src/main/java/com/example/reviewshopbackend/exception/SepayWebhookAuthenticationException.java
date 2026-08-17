package com.example.reviewshopbackend.exception;

public class SepayWebhookAuthenticationException extends RuntimeException {
    public SepayWebhookAuthenticationException() {
        super("Invalid SePay webhook credentials");
    }
}
