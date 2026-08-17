package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.dto.response.JobResponse;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.PlatformSettingsService;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.validator.job.JobCreationValidation;
import com.example.reviewshopbackend.validator.job.JobValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceImplTest {
    @Test
    void createSplitsOneHundredThousandBudgetUsingAdminFeeRate() {
        JobRepository jobRepository = mock(JobRepository.class);
        JobValidator jobValidator = mock(JobValidator.class);
        PlatformSettingsService platformSettingsService = mock(PlatformSettingsService.class);
        UserRepository userRepository = mock(UserRepository.class);
        AccountBalanceService accountBalanceService = mock(AccountBalanceService.class);
        JobServiceImpl service = new JobServiceImpl(
                jobRepository, jobValidator, platformSettingsService, userRepository, accountBalanceService);

        User client = client();
        CreateJobRequest request = request(new BigDecimal("100000.00"), 1);
        when(jobValidator.validate(request, client.getEmail()))
                .thenReturn(new JobCreationValidation(client, requiredLevel()));
        when(userRepository.findByIdForUpdate(client.getId())).thenReturn(java.util.Optional.of(client));
        when(jobRepository.findByClientAndIdempotencyKey(client, "unit-create-1"))
                .thenReturn(java.util.Optional.empty());
        when(platformSettingsService.getCurrentPlatformFeeRate()).thenReturn(new BigDecimal("0.5000"));
        when(jobRepository.saveAndFlush(any(Job.class))).thenAnswer(invocation -> {
            Job job = invocation.getArgument(0);
            job.setId(1L);
            return job;
        });

        JobResponse response = service.create(request, client.getEmail(), "unit-create-1");

        assertEquals(new BigDecimal("50000.00"), response.pricePerTask());
        assertEquals(JobStatus.OPEN, response.status());
        assertEquals(1, response.availableSlots());
        assertEquals(0, response.completedSlots());
        verify(platformSettingsService).getCurrentPlatformFeeRate();
    }

    @Test
    void createKeepsRoundingRemainderInsideFreelancerBudget() {
        JobRepository jobRepository = mock(JobRepository.class);
        JobValidator jobValidator = mock(JobValidator.class);
        PlatformSettingsService platformSettingsService = mock(PlatformSettingsService.class);
        UserRepository userRepository = mock(UserRepository.class);
        AccountBalanceService accountBalanceService = mock(AccountBalanceService.class);
        JobServiceImpl service = new JobServiceImpl(
                jobRepository, jobValidator, platformSettingsService, userRepository, accountBalanceService);

        User client = client();
        CreateJobRequest request = request(new BigDecimal("100000.00"), 3);
        when(jobValidator.validate(request, client.getEmail()))
                .thenReturn(new JobCreationValidation(client, requiredLevel()));
        when(userRepository.findByIdForUpdate(client.getId())).thenReturn(java.util.Optional.of(client));
        when(jobRepository.findByClientAndIdempotencyKey(client, "unit-create-2"))
                .thenReturn(java.util.Optional.empty());
        when(platformSettingsService.getCurrentPlatformFeeRate()).thenReturn(new BigDecimal("0.5000"));
        when(jobRepository.saveAndFlush(any(Job.class))).thenAnswer(invocation -> {
            Job job = invocation.getArgument(0);
            job.setId(1L);
            return job;
        });

        JobResponse response = service.create(request, client.getEmail(), "unit-create-2");

        assertEquals(new BigDecimal("50000.00"), response.pricePerTask());
    }

    private static User client() {
        User client = new User();
        client.setId(10L);
        client.setEmail("client@example.com");
        client.setFullName("Client");
        client.setPasswordHash("hash");
        client.setRole(UserRole.CLIENT);
        return client;
    }

    private static RequiredLevel requiredLevel() {
        RequiredLevel requiredLevel = new RequiredLevel();
        requiredLevel.setId(1L);
        requiredLevel.setDescription("Account level from 1 to 3");
        requiredLevel.setPricePerReview(new BigDecimal("10000.00"));
        return requiredLevel;
    }

    private static CreateJobRequest request(BigDecimal pricePerReview, int totalSlots) {
        return new CreateJobRequest(
                "Review job",
                "Description",
                "https://www.google.com/maps/place/example",
                1L,
                pricePerReview,
                totalSlots,
                java.util.List.of()
        );
    }
}
