package com.example.reviewshopbackend.exception;

public class InvalidCsrfTokenException extends RuntimeException {
    public InvalidCsrfTokenException() {
        super("Invalid CSRF token");
    }
}
