package com.example.reviewshopbackend.exception;

public class JobAssignmentConflictException extends RuntimeException {
    public JobAssignmentConflictException(String message) {
        super(message);
    }
}
