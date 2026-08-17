package com.example.reviewshopbackend.exception;

public class JobIdempotencyConflictException extends RuntimeException {
    public JobIdempotencyConflictException(String message) {
        super(message);
    }
}
