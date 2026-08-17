package com.example.reviewshopbackend.dto.response;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        UserRole role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }
}
