package com.example.reviewshopbackend.config;

import java.util.Locale;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrapConfig {
    @Bean
    public ApplicationRunner bootstrapAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:}") String configuredEmail,
            @Value("${app.admin.password:}") String configuredPassword,
            @Value("${app.admin.full-name:Platform Admin}") String configuredFullName
    ) {
        return args -> {
            String email = configuredEmail.trim().toLowerCase(Locale.ROOT);
            if (email.isEmpty() && configuredPassword.isEmpty()) {
                return;
            }
            if (email.isEmpty() || configuredPassword.length() < 12 || configuredPassword.length() > 64) {
                throw new IllegalStateException(
                        "ADMIN_EMAIL and ADMIN_PASSWORD (12-64 characters) must both be configured"
                );
            }

            userRepository.findByEmail(email).ifPresentOrElse(existingUser -> {
                if (existingUser.getRole() != UserRole.ADMIN) {
                    throw new IllegalStateException("Configured admin email already belongs to a non-admin account");
                }
            }, () -> {
                User admin = new User();
                admin.setFullName(configuredFullName.trim());
                admin.setEmail(email);
                admin.setPasswordHash(passwordEncoder.encode(configuredPassword));
                admin.setRole(UserRole.ADMIN);
                userRepository.save(admin);
            });
        };
    }
}
