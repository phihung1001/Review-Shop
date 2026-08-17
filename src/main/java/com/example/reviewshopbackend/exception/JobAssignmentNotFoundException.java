package com.example.reviewshopbackend.exception;

public class JobAssignmentNotFoundException extends RuntimeException {
    public JobAssignmentNotFoundException(Long id) {
        super("Job assignment not found: " + id);
    }
}
