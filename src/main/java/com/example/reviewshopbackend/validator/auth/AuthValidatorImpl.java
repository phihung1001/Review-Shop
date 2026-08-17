package com.example.reviewshopbackend.validator.auth;

import com.example.reviewshopbackend.exception.EmailAlreadyExistsException;
import com.example.reviewshopbackend.repository.UserRepository;

import org.springframework.stereotype.Component;

@Component
public class AuthValidatorImpl implements AuthValidator {
    private final UserRepository userRepository;

    public AuthValidatorImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void validate(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already exists");
        }
    }
}
