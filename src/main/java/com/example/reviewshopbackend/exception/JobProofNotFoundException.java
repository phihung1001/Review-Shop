package com.example.reviewshopbackend.exception;

public class JobProofNotFoundException extends RuntimeException {
    public JobProofNotFoundException(Long id) {
        super("Job proof not found: " + id);
    }
}
