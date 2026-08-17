package com.example.reviewshopbackend.service.impl;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.example.reviewshopbackend.dto.request.ClaimJobRequest;
import com.example.reviewshopbackend.dto.response.ClaimJobResponse;
import com.example.reviewshopbackend.dto.response.JobAssignmentSummaryResponse;
import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.ReviewContent;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.exception.JobAssignmentConflictException;
import com.example.reviewshopbackend.exception.JobAssignmentNotFoundException;
import com.example.reviewshopbackend.repository.JobAssignmentRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.repository.GoogleMapsAccountRepository;
import com.example.reviewshopbackend.service.JobAssignmentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobAssignmentServiceImpl implements JobAssignmentService {
    public static final Set<AssignmentStatus> OCCUPIED_STATUSES = Set.of(
            AssignmentStatus.CLAIMED,
            AssignmentStatus.SUBMITTED,
            AssignmentStatus.APPROVED
    );

    private final JobAssignmentRepository assignmentRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final GoogleMapsAccountRepository googleMapsAccountRepository;
    private final Duration claimTtl;

    public JobAssignmentServiceImpl(
            JobAssignmentRepository assignmentRepository,
            JobRepository jobRepository,
            UserRepository userRepository,
            GoogleMapsAccountRepository googleMapsAccountRepository,
            @Value("${app.job-assignment.claim-ttl-minutes:10}") long claimTtlMinutes
    ) {
        if (claimTtlMinutes <= 0) {
            throw new IllegalArgumentException("Job assignment claim TTL must be greater than zero");
        }
        this.assignmentRepository = assignmentRepository;
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.googleMapsAccountRepository = googleMapsAccountRepository;
        this.claimTtl = Duration.ofMinutes(claimTtlMinutes);
    }

    @Override
    @Transactional
    public ClaimJobResponse claim(Long jobId, ClaimJobRequest request, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        Job job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new JobAssignmentConflictException("Job not found"));
        releaseExpiredClaims(job, Instant.now());

        if (job.getStatus() != JobStatus.OPEN || job.getAvailableSlots() <= 0) {
            throw new JobAssignmentConflictException("Job has no available slot");
        }
        if (job.getClient().getId().equals(freelancer.getId())) {
            throw new JobAssignmentConflictException("Job owner cannot claim this job");
        }
        if (assignmentRepository.existsByJobAndFreelancerAndStatusIn(job, freelancer, OCCUPIED_STATUSES)) {
            throw new JobAssignmentConflictException("Freelancer already has an active assignment for this job");
        }

        GoogleMapsAccount googleAccount = googleMapsAccountRepository
                .findByIdAndFreelancer(request.googleMapsAccountId(), freelancer)
                .orElseThrow(() -> new JobAssignmentConflictException("Selected Google Maps account was not found"));
        validateGoogleMapsAccount(googleAccount, job);

        validateReviewContent(job, request.reviewContentIndex());
        if (request.reviewContentIndex() != null
                && assignmentRepository.existsByJobAndReviewContentIndexAndStatusIn(
                        job,
                        request.reviewContentIndex(),
                        OCCUPIED_STATUSES
                )) {
            throw new JobAssignmentConflictException("Review content has already been assigned");
        }

        JobAssignment assignment = new JobAssignment();
        assignment.setJob(job);
        assignment.setFreelancer(freelancer);
        assignment.setGoogleMapsAccount(googleAccount);
        assignment.setGoogleMapsAccountName(googleAccount.getAccountName());
        assignment.setGoogleMapsContributorId(googleAccount.getContributorId());
        assignment.setLocalGuideLevel(googleAccount.getLocalGuideLevel());
        assignment.setGoogleMapsAccountType(googleAccount.getAccountType());
        assignment.setReviewContentIndex(request.reviewContentIndex());
        assignment.setStatus(AssignmentStatus.CLAIMED);
        assignment.setExpiresAt(Instant.now().plus(claimTtl));

        job.setAvailableSlots(job.getAvailableSlots() - 1);
        if (job.getAvailableSlots() == 0) {
            job.setStatus(JobStatus.IN_PROGRESS);
        }
        return ClaimJobResponse.from(assignmentRepository.save(assignment));
    }

    private static void validateGoogleMapsAccount(GoogleMapsAccount account, Job job) {
        if (!account.isActive() || account.getAccountType() == null) {
            throw new JobAssignmentConflictException("Selected Google Maps account is not ready for jobs");
        }
        int requiredRank = job.getRequiredLevel().getRank() == null ? 1 : job.getRequiredLevel().getRank();
        if (account.getLocalGuideLevel() < requiredRank) {
            throw new JobAssignmentConflictException(
                    "Selected Google Maps account level is lower than the job required level");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobAssignmentSummaryResponse> findMine(String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        return assignmentRepository.findByFreelancerOrderByCreatedAtDesc(freelancer).stream()
                .map(JobAssignmentSummaryResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ClaimJobResponse findMineById(Long assignmentId, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        JobAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new JobAssignmentNotFoundException(assignmentId));
        requireOwner(assignment, freelancer);
        return ClaimJobResponse.from(assignment);
    }

    @Override
    @Transactional
    public void cancel(Long assignmentId, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        JobAssignment assignment = getForUpdate(assignmentId);
        requireOwner(assignment, freelancer);
        if (assignment.getStatus() != AssignmentStatus.CLAIMED) {
            throw new JobAssignmentConflictException("Only a claimed assignment can be cancelled");
        }
        Job job = jobRepository.findByIdForUpdate(assignment.getJob().getId())
                .orElseThrow(() -> new JobAssignmentConflictException("Job not found"));
        finishAndRelease(assignment, job, AssignmentStatus.CANCELLED, Instant.now());
    }

    @Override
    @Transactional
    public JobAssignment requireClaimedForSubmit(Long assignmentId, Long jobId, User freelancer) {
        if (assignmentId == null) {
            throw new JobAssignmentConflictException("assignmentId is required");
        }
        JobAssignment assignment = getForUpdate(assignmentId);
        requireOwner(assignment, freelancer);
        if (!assignment.getJob().getId().equals(jobId)) {
            throw new JobAssignmentConflictException("Assignment does not belong to this job");
        }
        if (assignment.getStatus() != AssignmentStatus.CLAIMED) {
            throw new JobAssignmentConflictException("Only a claimed assignment can submit proof");
        }
        Job job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new JobAssignmentConflictException("Job not found"));
        Instant now = Instant.now();
        if (!assignment.getExpiresAt().isAfter(now)) {
            throw new JobAssignmentConflictException("Job assignment has expired");
        }
        return assignment;
    }

    @Override
    @Scheduled(cron = "${app.job-assignment.expiry-cleanup-cron:0 * * * * *}")
    @Transactional
    public void expireAssignments() {
        Instant now = Instant.now();
        List<Long> jobIds = assignmentRepository.findByStatusAndExpiresAtLessThanEqualOrderById(
                AssignmentStatus.CLAIMED,
                now
        ).stream().map(assignment -> assignment.getJob().getId()).distinct().sorted().toList();
        for (Long jobId : jobIds) {
            jobRepository.findByIdForUpdate(jobId).ifPresent(job -> releaseExpiredClaims(job, now));
        }
    }

    private User requireFreelancer(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        if (user.getRole() != UserRole.FREELANCER) {
            throw new AccessDeniedException("User does not have the required role");
        }
        return user;
    }

    private JobAssignment getForUpdate(Long id) {
        return assignmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new JobAssignmentNotFoundException(id));
    }

    private static void requireOwner(JobAssignment assignment, User freelancer) {
        if (!assignment.getFreelancer().getId().equals(freelancer.getId())) {
            throw new AccessDeniedException("Job assignment belongs to another freelancer");
        }
    }

    private static void validateReviewContent(Job job, Integer index) {
        List<ReviewContent> contents = job.getReviewContents();
        if (contents == null || contents.isEmpty()) {
            if (index != null) {
                throw new JobAssignmentConflictException("This job does not have review content");
            }
            return;
        }
        if (index == null || index < 0 || index >= contents.size()) {
            throw new JobAssignmentConflictException("A valid reviewContentIndex is required");
        }
    }

    private static void finishAndRelease(
            JobAssignment assignment,
            Job job,
            AssignmentStatus status,
            Instant now
    ) {
        assignment.setStatus(status);
        assignment.setFinishedAt(now);
        job.setAvailableSlots(job.getAvailableSlots() + 1);
        if (job.getStatus() != JobStatus.COMPLETED) {
            job.setStatus(JobStatus.OPEN);
        }
    }

    private void releaseExpiredClaims(Job job, Instant now) {
        List<JobAssignment> expired = assignmentRepository
                .findByJobAndStatusAndExpiresAtLessThanEqual(job, AssignmentStatus.CLAIMED, now);
        for (JobAssignment assignment : expired) {
            finishAndRelease(assignment, job, AssignmentStatus.EXPIRED, now);
        }
    }
}
