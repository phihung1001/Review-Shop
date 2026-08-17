package com.example.reviewshopbackend.service.impl;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.locks.LockSupport;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.example.reviewshopbackend.dto.request.ForgotPasswordRequest;
import com.example.reviewshopbackend.dto.request.LoginRequest;
import com.example.reviewshopbackend.dto.request.RegisterRequest;
import com.example.reviewshopbackend.dto.request.ResetPasswordRequest;
import com.example.reviewshopbackend.dto.response.AuthResponse;
import com.example.reviewshopbackend.dto.response.MessageResponse;
import com.example.reviewshopbackend.dto.response.UserResponse;
import com.example.reviewshopbackend.entity.PasswordResetToken;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.exception.EmailAlreadyExistsException;
import com.example.reviewshopbackend.exception.InvalidPasswordResetTokenException;
import com.example.reviewshopbackend.repository.PasswordResetTokenRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AuthService;
import com.example.reviewshopbackend.service.AuthenticationResult;
import com.example.reviewshopbackend.service.EmailService;
import com.example.reviewshopbackend.service.JwtTokenService;
import com.example.reviewshopbackend.service.RefreshTokenService;
import com.example.reviewshopbackend.validator.auth.AuthValidator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default authentication application service. It coordinates credential verification,
 * JWT issuance, refresh-token lifecycle, and OTP-based password recovery.
 */
@Service
public class AuthServiceImpl implements AuthService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PASSWORD_RESET_RESPONSE_MESSAGE =
            "If the email exists, a password reset OTP has been sent";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuthValidator authValidator;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final Duration passwordResetTokenTtl;
    private final byte[] passwordResetPepper;
    private final Duration minimumPasswordResetResponseTime;
    private final String dummyPasswordHash;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AuthValidator authValidator,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService,
            @Value("${app.password-reset.otp-ttl-minutes}") long passwordResetTokenTtlMinutes,
            @Value("${app.password-reset.otp-pepper}") String passwordResetPepper,
            @Value("${app.password-reset.minimum-response-millis}") long minimumResponseMillis
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.authValidator = authValidator;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetTokenTtl = Duration.ofMinutes(passwordResetTokenTtlMinutes);
        this.passwordResetPepper = passwordResetPepper.getBytes(StandardCharsets.UTF_8);
        if (this.passwordResetPepper.length < 32) {
            throw new IllegalArgumentException("Password reset pepper must contain at least 32 bytes");
        }
        this.minimumPasswordResetResponseTime = Duration.ofMillis(Math.max(0, minimumResponseMillis));
        this.dummyPasswordHash = passwordEncoder.encode("dummy-password-value-never-used");
    }

    @Override
    @Transactional
    public AuthenticationResult register(RegisterRequest request) {
        if (request.role() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Admin accounts cannot be created through public registration");
        }
        String email = normalizeEmail(request.email());
        authValidator.validate(email);

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        try {
            User savedUser = userRepository.saveAndFlush(user);
            return authenticatedResponse("Register successfully", savedUser);
        } catch (DataIntegrityViolationException exception) {
            throw new EmailAlreadyExistsException("Email already exists", exception);
        }
    }

    @Override
    @Transactional
    public AuthenticationResult login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Optional<User> foundUser = userRepository.findByEmail(email);
        String passwordHash = foundUser.map(User::getPasswordHash).orElse(dummyPasswordHash);

        if (!passwordEncoder.matches(request.password(), passwordHash) || foundUser.isEmpty()) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return authenticatedResponse("Login successfully", foundUser.orElseThrow());
    }

    @Override
    @Transactional(noRollbackFor = com.example.reviewshopbackend.exception.InvalidRefreshTokenException.class)
    public AuthenticationResult refresh(String refreshToken) {
        RefreshTokenService.RotatedToken rotatedToken = refreshTokenService.rotate(refreshToken);
        return authenticatedResponse(
                "Token refreshed successfully",
                rotatedToken.user(),
                rotatedToken.value(),
                rotatedToken.ttl()
        );
    }

    @Override
    @Transactional
    public MessageResponse logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
        return new MessageResponse("Logout successfully");
    }

    @Override
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        long startedAt = System.nanoTime();
        String email = normalizeEmail(request.email());
        Optional<User> user = userRepository.findByEmail(email);

        // Always return the same response to prevent account enumeration.
        user.ifPresent(this::createAndSendPasswordResetToken);
        waitUntilMinimumResponseTime(startedAt);

        return new MessageResponse(PASSWORD_RESET_RESPONSE_MESSAGE);
    }

    @Override
    @Transactional(noRollbackFor = InvalidPasswordResetTokenException.class)
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Invalid or expired password reset OTP"));
        PasswordResetToken passwordResetToken = passwordResetTokenRepository.findByUser(user)
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Invalid or expired password reset OTP"));

        if (passwordResetToken.getUsedAt() != null
                || !passwordResetToken.getExpiresAt().isAfter(Instant.now())
                || currentFailedAttempts(passwordResetToken) >= 5) {
            throw new InvalidPasswordResetTokenException("Invalid or expired password reset OTP");
        }

        byte[] expectedHash = HexFormat.of().parseHex(passwordResetToken.getTokenHash());
        byte[] suppliedHash = HexFormat.of().parseHex(hashOtp(user.getEmail(), request.otp()));
        if (!MessageDigest.isEqual(expectedHash, suppliedHash)) {
            int failedAttempts = currentFailedAttempts(passwordResetToken) + 1;
            passwordResetToken.setFailedAttempts(failedAttempts);
            if (failedAttempts >= 5) {
                passwordResetToken.setUsedAt(Instant.now());
            }
            throw new InvalidPasswordResetTokenException("Invalid or expired password reset OTP");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        // Incrementing the version immediately invalidates all previously issued access tokens.
        user.setAuthVersion(currentAuthVersion(user) + 1);
        passwordResetToken.setUsedAt(Instant.now());
        refreshTokenService.revokeAllForUser(user);
        emailService.sendPasswordChangedNotice(user.getEmail());

        return new MessageResponse("Password has been reset successfully");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthenticationResult authenticatedResponse(String message, User user) {
        RefreshTokenService.IssuedToken refreshToken = refreshTokenService.issue(user);
        return authenticatedResponse(message, user, refreshToken.value(), refreshToken.ttl());
    }

    private AuthenticationResult authenticatedResponse(
            String message,
            User user,
            String refreshToken,
            Duration refreshTokenTtl
    ) {
        JwtTokenService.Token token = jwtTokenService.issue(user);
        return new AuthenticationResult(
                new AuthResponse(
                        message,
                        token.value(),
                        "Bearer",
                        token.expiresInSeconds(),
                        UserResponse.from(user)
                ),
                refreshToken,
                refreshTokenTtl
        );
    }

    private static int currentAuthVersion(User user) {
        return user.getAuthVersion() == null ? 0 : user.getAuthVersion();
    }

    private static int currentFailedAttempts(PasswordResetToken token) {
        return token.getFailedAttempts() == null ? 0 : token.getFailedAttempts();
    }

    private void createAndSendPasswordResetToken(User user) {
        passwordResetTokenRepository.deleteByUser(user);

        String otp = generateOtp();

        PasswordResetToken passwordResetToken = new PasswordResetToken();
        passwordResetToken.setUser(user);
        passwordResetToken.setTokenHash(hashOtp(user.getEmail(), otp));
        passwordResetToken.setExpiresAt(Instant.now().plus(passwordResetTokenTtl));
        passwordResetTokenRepository.save(passwordResetToken);

        emailService.sendPasswordResetOtp(user.getEmail(), otp, passwordResetTokenTtl.toMinutes());
    }

    private String generateOtp() {
        return "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
    }

    private String hashOtp(String email, String otp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(passwordResetPepper, "HmacSHA256"));
            String value = normalizeEmail(email) + ":" + otp.trim();
            byte[] hash = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot hash password reset OTP", exception);
        }
    }

    private void waitUntilMinimumResponseTime(long startedAt) {
        long remainingNanos = minimumPasswordResetResponseTime.toNanos() - (System.nanoTime() - startedAt);
        if (remainingNanos > 0) {
            LockSupport.parkNanos(remainingNanos);
        }
    }
}
