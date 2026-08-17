package com.example.reviewshopbackend.validator.job;

import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;

public record JobCreationValidation(User client, RequiredLevel requiredLevel) {
}
