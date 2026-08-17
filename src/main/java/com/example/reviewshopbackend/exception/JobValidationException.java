package com.example.reviewshopbackend.exception;

public class JobValidationException extends RuntimeException {
    public JobValidationException(String message) {
        super(message);
    }
}
