package com.example.reviewshopbackend.exception;

public class RequiredLevelNotFoundException extends RuntimeException {
    public RequiredLevelNotFoundException(Long id) {
        super("Required level not found with id: " + id);
    }
}
