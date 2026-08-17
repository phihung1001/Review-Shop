package com.example.reviewshopbackend.service;

/**
 * Provides outbound transactional email operations.
 */
public interface EmailService {
    /**
     * Sends a single-use password reset code to a user.
     *
     * @param toEmail destination email address
     * @param otp one-time verification code
     * @param expiresInMinutes number of minutes before the code expires
     */
    void sendPasswordResetOtp(String toEmail, String otp, long expiresInMinutes);

    /**
     * Notifies a user that the account password was changed.
     *
     * @param toEmail destination email address
     */
    void sendPasswordChangedNotice(String toEmail);
}
