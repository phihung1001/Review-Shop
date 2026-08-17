package com.example.reviewshopbackend.repository;

import java.util.Optional;

import com.example.reviewshopbackend.entity.PasswordResetToken;
import com.example.reviewshopbackend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByUser(User user);

    void deleteByUser(User user);
}
