package com.example.reviewshopbackend.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.SecretKey;

import com.example.reviewshopbackend.exception.InvalidCsrfTokenException;
import org.springframework.stereotype.Component;

@Component
public class RefreshCsrfService {
    private final SecretKey signingKey;

    public RefreshCsrfService(SecretKey signingKey) {
        this.signingKey = signingKey;
    }

    public String createToken(String refreshToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(signingKey);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    mac.doFinal(refreshToken.getBytes(StandardCharsets.UTF_8))
            );
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot create CSRF token", exception);
        }
    }

    public void validate(String refreshToken, String csrfCookie, String csrfHeader) {
        if (refreshToken == null || csrfCookie == null || csrfHeader == null) {
            throw new InvalidCsrfTokenException();
        }
        String expected = createToken(refreshToken);
        boolean cookieValid = MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                csrfCookie.getBytes(StandardCharsets.UTF_8)
        );
        boolean headerValid = MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                csrfHeader.getBytes(StandardCharsets.UTF_8)
        );
        if (!cookieValid || !headerValid) {
            throw new InvalidCsrfTokenException();
        }
    }
}
