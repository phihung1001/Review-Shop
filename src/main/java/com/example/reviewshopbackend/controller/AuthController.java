package com.example.reviewshopbackend.controller;

import com.example.reviewshopbackend.dto.request.LoginRequest;
import com.example.reviewshopbackend.dto.request.ForgotPasswordRequest;
import com.example.reviewshopbackend.dto.request.RegisterRequest;
import com.example.reviewshopbackend.dto.request.ResetPasswordRequest;
import com.example.reviewshopbackend.dto.response.AuthResponse;
import com.example.reviewshopbackend.dto.response.MessageResponse;
import com.example.reviewshopbackend.service.AuthService;
import com.example.reviewshopbackend.service.AuthenticationResult;
//import com.example.reviewshopbackend.security.AuthRateLimiter;
import com.example.reviewshopbackend.security.RefreshCsrfService;

import java.time.Duration;
import java.util.Locale;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final String refreshCookieName;
    private final boolean refreshCookieSecure;
    private final String csrfCookieName;
//    private final AuthRateLimiter rateLimiter;
    private final RefreshCsrfService csrfService;

    public AuthController(
            AuthService authService,
//            AuthRateLimiter rateLimiter,
            RefreshCsrfService csrfService,
            @Value("${app.jwt.refresh-cookie-name}") String refreshCookieName,
            @Value("${app.jwt.refresh-cookie-secure}") boolean refreshCookieSecure, // hiện tại đang = false, cho phép gửi request từ http.
            @Value("${app.jwt.csrf-cookie-name}") String csrfCookieName
    ) {
        this.authService = authService;
        this.refreshCookieName = refreshCookieName;
        this.refreshCookieSecure = refreshCookieSecure;
        this.csrfCookieName = csrfCookieName;
//        this.rateLimiter = rateLimiter;
        this.csrfService = csrfService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest
    ) {
        checkIpLimit("register", servletRequest, 10, Duration.ofHours(1));
        return authenticationResponse(authService.register(request), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        checkIpLimit("login", servletRequest, 20, Duration.ofMinutes(15));
//        rateLimiter.check("login-email", normalizeEmail(request.email()), 8, Duration.ofMinutes(15));
        return authenticationResponse(authService.login(request), HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "${app.jwt.refresh-cookie-name}", required = false) String refreshToken,
            @CookieValue(name = "${app.jwt.csrf-cookie-name}", required = false) String csrfCookie,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfHeader,
            HttpServletRequest servletRequest
    ) {
        checkIpLimit("refresh", servletRequest, 60, Duration.ofMinutes(15));
        csrfService.validate(refreshToken, csrfCookie, csrfHeader);
        return authenticationResponse(authService.refresh(refreshToken), HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @CookieValue(name = "${app.jwt.refresh-cookie-name}", required = false) String refreshToken,
            @CookieValue(name = "${app.jwt.csrf-cookie-name}", required = false) String csrfCookie,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfHeader
    ) {
        if (refreshToken != null) {
            csrfService.validate(refreshToken, csrfCookie, csrfHeader);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .header(HttpHeaders.SET_COOKIE, clearCsrfCookie().toString())
                .body(authService.logout(refreshToken));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        checkIpLimit("forgot-password", servletRequest, 20, Duration.ofHours(1));
//        rateLimiter.check("forgot-email", normalizeEmail(request.email()), 3, Duration.ofHours(1));
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        checkIpLimit("reset-password", servletRequest, 30, Duration.ofMinutes(15));
//        rateLimiter.check("reset-email", normalizeEmail(request.email()), 10, Duration.ofMinutes(15));
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    private ResponseEntity<AuthResponse> authenticationResponse(
            AuthenticationResult authentication,
            HttpStatus status
    ) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, refreshCookie(authentication).toString())
                .header(HttpHeaders.SET_COOKIE, csrfCookie(authentication).toString())
                .body(authentication.response());
    }

    private ResponseCookie refreshCookie(AuthenticationResult authentication) {
        return ResponseCookie.from(refreshCookieName, authentication.refreshToken())
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(authentication.refreshTokenTtl())
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();
    }

    private ResponseCookie csrfCookie(AuthenticationResult authentication) {
        return ResponseCookie.from(
                        csrfCookieName,
                        csrfService.createToken(authentication.refreshToken())
                )
                .httpOnly(false)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(authentication.refreshTokenTtl())
                .build();
    }

    private ResponseCookie clearCsrfCookie() {
        return ResponseCookie.from(csrfCookieName, "")
                .httpOnly(false)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
    }

    private void checkIpLimit(
            String operation,
            HttpServletRequest request,
            int limit,
            Duration duration
    ) {
//        rateLimiter.check(operation + "-ip", request.getRemoteAddr(), limit, duration);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
