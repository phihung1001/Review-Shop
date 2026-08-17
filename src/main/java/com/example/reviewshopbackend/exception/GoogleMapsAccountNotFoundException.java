package com.example.reviewshopbackend.exception;

public class GoogleMapsAccountNotFoundException extends RuntimeException {
    public GoogleMapsAccountNotFoundException(Long id) { super("Google Maps account not found with ID: " + id); }
}
