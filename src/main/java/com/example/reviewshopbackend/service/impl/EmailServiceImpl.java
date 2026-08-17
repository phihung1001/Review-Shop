package com.example.reviewshopbackend.service.impl;

import com.example.reviewshopbackend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.util.StringUtils;

/**
 * Sends transactional email through the configured Spring mail provider.
 * When mail is not configured, development environments fall back to application logging.
 */
@Service
public class EmailServiceImpl implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String fromEmail;

    public EmailServiceImpl(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.from:}") String fromEmail
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.fromEmail = fromEmail;
    }

    @Override
    @Async
    public void sendPasswordResetOtp(String toEmail, String otp, long expiresInMinutes) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Password reset email was not sent because mail is not configured");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(fromEmail)) {
            message.setFrom(fromEmail);
        }
        message.setTo(toEmail);
        message.setSubject("Reset your Review Shop password");
        message.setText("""
                You requested to reset your Review Shop password.

                Your verification code is: %s

                This code expires in %d minutes and can only be used once.

                If you did not request this, you can ignore this email.
                """.formatted(otp, expiresInMinutes));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.warn("Could not send password reset email to {}", toEmail, exception);
        }
    }

    @Override
    @Async
    public void sendPasswordChangedNotice(String toEmail) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Password change notification was not sent because mail is not configured");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        if (StringUtils.hasText(fromEmail)) {
            message.setFrom(fromEmail);
        }
        message.setTo(toEmail);
        message.setSubject("Your Review Shop password was changed");
        message.setText("""
                Your Review Shop password was changed successfully.

                If you did not perform this action, contact support immediately.
                """);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.warn("Could not send password change notification", exception);
        }
    }
}
