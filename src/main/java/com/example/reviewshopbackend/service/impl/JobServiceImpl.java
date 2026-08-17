package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.dto.response.JobResponse;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.exception.JobNotFoundException;
import com.example.reviewshopbackend.exception.JobIdempotencyConflictException;
import com.example.reviewshopbackend.exception.JobValidationException;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.JobService;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.service.PlatformSettingsService;
import com.example.reviewshopbackend.validator.job.JobCreationValidation;
import com.example.reviewshopbackend.validator.job.JobValidator;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobServiceImpl implements JobService {
    private final JobRepository jobRepository;
    private final JobValidator jobValidator;
    private final PlatformSettingsService platformSettingsService;
    private final UserRepository userRepository;
    private final AccountBalanceService accountBalanceService;

    public JobServiceImpl(
            JobRepository jobRepository,
            JobValidator jobValidator,
            PlatformSettingsService platformSettingsService,
            UserRepository userRepository,
            AccountBalanceService accountBalanceService
    ) {
        this.jobRepository = jobRepository;
        this.jobValidator = jobValidator;
        this.platformSettingsService = platformSettingsService;
        this.userRepository = userRepository;
        this.accountBalanceService = accountBalanceService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobResponse> findMine(String clientEmail) {
        User client = requireClient(clientEmail);
        return jobRepository.findByClientOrderByCreatedAtDesc(client).stream()
                .map(JobResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public JobResponse findMineById(Long jobId, String clientEmail) {
        User client = requireClient(clientEmail);
        return jobRepository.findByIdAndClient(jobId, client)
                .map(JobResponse::from)
                .orElseThrow(() -> new JobNotFoundException(jobId));
    }

    private User requireClient(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        if (user.getRole() != UserRole.CLIENT) {
            throw new AccessDeniedException("User does not have the required role");
        }
        return user;
    }

    @Override
    @Transactional
    public JobResponse create(CreateJobRequest request, String clientEmail, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        String requestFingerprint = fingerprint(request);
        JobCreationValidation validation = jobValidator.validate(request, clientEmail);
        User lockedClient = userRepository.findByIdForUpdate(validation.client().getId())
                .orElseThrow(() -> new JobValidationException("Client not found"));

        var existingJob = jobRepository.findByClientAndIdempotencyKey(lockedClient, normalizedKey);
        if (existingJob.isPresent()) {
            Job job = existingJob.orElseThrow();
            if (!requestFingerprint.equals(job.getRequestFingerprint())) {
                throw new JobIdempotencyConflictException(
                        "Idempotency-Key was already used with a different job request");
            }
            return JobResponse.from(job);
        }

        BigDecimal pricePerReview = request.pricePerReview().setScale(2, RoundingMode.UNNECESSARY);
        BigDecimal totalBudget = calculateTotalBudget(pricePerReview, request.totalReviews());
        BigDecimal platformFeeRate = platformSettingsService.getCurrentPlatformFeeRate();
        BigDecimal platformFeeAmount = totalBudget
                .multiply(platformFeeRate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal freelancerBudget = totalBudget.subtract(platformFeeAmount);
        BigDecimal pricePerTask = freelancerBudget.divide(
                BigDecimal.valueOf(request.totalReviews()),
                2,
                RoundingMode.DOWN
        );
        if (pricePerTask.signum() <= 0) {
            throw new JobValidationException("Budget is too small for the requested number of slots");
        }

        Job job = new Job();
        job.setClient(lockedClient);
        job.setIdempotencyKey(normalizedKey);
        job.setRequestFingerprint(requestFingerprint);
        job.setTitle(request.title().trim());
        job.setDescription(request.description().trim());
        job.setMapLink(request.mapLink().trim());
        job.setRequiredLevel(validation.requiredLevel());
        job.setPricePerReview(pricePerReview);
        job.setReviewContents(request.reviewContents() == null ? List.of() : request.reviewContents());
        job.setPricePerTask(pricePerTask);
        job.setTotalReviews(request.totalReviews());
        job.setAvailableSlots(request.totalReviews());
        job.setCompletedSlots(0);
        job.setPlatformFeeRate(platformFeeRate);
        job.setPlatformFeeAmount(platformFeeAmount);
        job.setTotalBudget(totalBudget);
        job.setFreelancerBudget(freelancerBudget);
        job.setRemainingFreelancerBudget(freelancerBudget);
        job.setStatus(JobStatus.OPEN);

        Job savedJob = jobRepository.saveAndFlush(job);
        accountBalanceService.holdJobFunds(lockedClient, savedJob);
        return JobResponse.from(savedJob);
    }

    private static String normalizeIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new JobValidationException("Idempotency-Key header must not be blank");
        }
        String normalized = idempotencyKey.trim();
        if (normalized.length() > 100) {
            throw new JobValidationException("Idempotency-Key header must not exceed 100 characters");
        }
        return normalized;
    }

    private static String fingerprint(CreateJobRequest request) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, request.title().trim());
        append(canonical, request.description().trim());
        append(canonical, request.mapLink().trim());
        append(canonical, request.requiredLevelId().toString());
        append(canonical, request.pricePerReview().setScale(2, RoundingMode.UNNECESSARY).toPlainString());
        append(canonical, request.totalReviews().toString());
        var contents = request.reviewContents() == null ? List.<com.example.reviewshopbackend.entity.ReviewContent>of()
                : request.reviewContents();
        append(canonical, Integer.toString(contents.size()));
        for (var content : contents) {
            append(canonical, content.content());
            append(canonical, Integer.toString(content.images().size()));
            content.images().forEach(image -> append(canonical, image));
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static void append(StringBuilder target, String value) {
        String safeValue = value == null ? "" : value;
        target.append(safeValue.length()).append(':').append(safeValue).append('|');
    }

    private static BigDecimal calculateTotalBudget(BigDecimal pricePerReview, int requiredReviews) {
        if (pricePerReview == null) {
            throw new JobValidationException("Either pricePerReview or totalBudget is required");
        }
        return pricePerReview
                .multiply(BigDecimal.valueOf(requiredReviews))
                .setScale(2, RoundingMode.UNNECESSARY);
    }

}
