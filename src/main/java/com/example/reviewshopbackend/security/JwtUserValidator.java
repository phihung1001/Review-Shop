package com.example.reviewshopbackend.security;

import com.example.reviewshopbackend.repository.UserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtUserValidator implements OAuth2TokenValidator<Jwt> {
    private static final OAuth2Error INVALID_TOKEN = new OAuth2Error(
            "invalid_token",
            "The token is no longer valid",
            null
    );

    private final UserRepository userRepository;

    public JwtUserValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Number tokenVersion = jwt.getClaim("authVersion");
        if (jwt.getSubject() == null || tokenVersion == null) {
            return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
        }

        return userRepository.findByEmail(jwt.getSubject())
                .filter(user -> currentVersion(user.getAuthVersion()) == tokenVersion.intValue())
                .map(user -> OAuth2TokenValidatorResult.success())
                .orElseGet(() -> OAuth2TokenValidatorResult.failure(INVALID_TOKEN));
    }

    private static int currentVersion(Integer version) {
        return version == null ? 0 : version;
    }
}
