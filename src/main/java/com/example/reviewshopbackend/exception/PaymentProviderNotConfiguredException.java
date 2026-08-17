package com.example.reviewshopbackend.exception;

public class PaymentProviderNotConfiguredException extends RuntimeException {
    public PaymentProviderNotConfiguredException(String message) {
        super(message);
    }
}
