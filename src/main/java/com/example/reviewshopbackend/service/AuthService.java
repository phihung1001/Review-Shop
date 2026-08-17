package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.dto.request.LoginRequest;
import com.example.reviewshopbackend.dto.request.ForgotPasswordRequest;
import com.example.reviewshopbackend.dto.request.RegisterRequest;
import com.example.reviewshopbackend.dto.request.ResetPasswordRequest;
import com.example.reviewshopbackend.dto.response.MessageResponse;

/**
 * Defines authentication, session renewal, logout, and password-recovery use cases.
 */
public interface AuthService {
    /**
     * Registers a non-administrative user and starts a new authenticated session.
     *
     * @param request validated registration data
     * @return access-token response and refresh-token cookie data
     */
    AuthenticationResult register(RegisterRequest request);

    /**
     * Verifies user credentials and starts a new authenticated session.
     *
     * @param request login credentials
     * @return access-token response and refresh-token cookie data
     */
    AuthenticationResult login(LoginRequest request);

    /**
     * Rotates a refresh token and issues a new access token.
     *
     * @param refreshToken raw token received from the HTTP-only cookie
     * @return replacement access and refresh tokens
     */
    AuthenticationResult refresh(String refreshToken);

    /**
     * Revokes the refresh-token family associated with the current session.
     *
     * @param refreshToken raw token received from the HTTP-only cookie; may be absent
     * @return logout confirmation
     */
    MessageResponse logout(String refreshToken);

    /**
     * Creates and emails a one-time password reset code without revealing whether the account exists.
     *
     * @param request account email
     * @return generic request acknowledgement
     */
    MessageResponse forgotPassword(ForgotPasswordRequest request);

    /**
     * Resets a password using a valid OTP and invalidates the user's active authentication sessions.
     *
     * @param request email, OTP, and replacement password
     * @return reset confirmation
     */
    MessageResponse resetPassword(ResetPasswordRequest request);
}
