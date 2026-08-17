package com.example.reviewshopbackend.validator.job;

import java.util.Locale;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.exception.JobValidationException;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import org.springframework.stereotype.Component;

@Component
public class JobValidatorImpl implements JobValidator {
    private final UserRepository userRepository;
    private final RequiredLevelRepository requiredLevelRepository;

    public JobValidatorImpl(
            UserRepository userRepository,
            RequiredLevelRepository requiredLevelRepository
    ) {
        this.userRepository = userRepository;
        this.requiredLevelRepository = requiredLevelRepository;
    }

    @Override
    public JobCreationValidation validate(CreateJobRequest request, String clientEmail) {
        User client = userRepository.findByEmail(clientEmail.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new JobValidationException("Client not found"));
        if (client.getRole() != UserRole.CLIENT) {
            throw new JobValidationException("Only clients can create jobs");
        }
        RequiredLevel requiredLevel = requiredLevelRepository
                .findById(request.requiredLevelId())
                .orElseThrow(() -> new JobValidationException("Required level does not exist"));
        if (request.pricePerReview().compareTo(requiredLevel.getPricePerReview()) < 0) {
            throw new JobValidationException(
                    "Price per review must be greater than or equal to "
                            + requiredLevel.getPricePerReview().toPlainString()
                            + " for required level ID "
                            + requiredLevel.getId()
            );
        }
        return new JobCreationValidation(client, requiredLevel);
    }
}
