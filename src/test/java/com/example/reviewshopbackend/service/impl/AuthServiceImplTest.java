package com.example.reviewshopbackend.service.impl;

import com.example.reviewshopbackend.dto.request.RegisterRequest;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.PasswordResetTokenRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.EmailService;
import com.example.reviewshopbackend.service.JwtTokenService;
import com.example.reviewshopbackend.service.RefreshTokenService;
import com.example.reviewshopbackend.validator.auth.AuthValidator;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class AuthServiceImplTest {
    @Test
    void publicRegistrationCannotCreateAdmin() {
        AuthServiceImpl service = new AuthServiceImpl(
                mock(UserRepository.class),
                mock(PasswordResetTokenRepository.class),
                mock(PasswordEncoder.class),
                mock(EmailService.class),
                mock(AuthValidator.class),
                mock(JwtTokenService.class),
                mock(RefreshTokenService.class),
                15,
                "test-only-otp-pepper-with-at-least-32-bytes",
                0
        );
        RegisterRequest request = new RegisterRequest(
                "Admin",
                "admin@example.com",
                "password123",
                UserRole.ADMIN
        );

        assertThrows(IllegalArgumentException.class, () -> service.register(request));
    }
}
