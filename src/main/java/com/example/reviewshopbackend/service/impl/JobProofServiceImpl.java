package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.example.reviewshopbackend.dto.request.RejectJobProofRequest;
import com.example.reviewshopbackend.dto.request.SubmitJobProofRequest;
import com.example.reviewshopbackend.dto.response.FreelancerOpenJobResponse;
import com.example.reviewshopbackend.dto.response.JobProofResponse;
import com.example.reviewshopbackend.dto.response.JobReviewContentResponse;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.JobProof;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.ProofStatus;
import com.example.reviewshopbackend.entity.ReviewContent;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.exception.JobProofConflictException;
import com.example.reviewshopbackend.exception.JobProofNotFoundException;
import com.example.reviewshopbackend.exception.JobValidationException;
import com.example.reviewshopbackend.repository.JobProofRepository;
import com.example.reviewshopbackend.repository.JobAssignmentRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.JobProofService;
import com.example.reviewshopbackend.service.JobAssignmentService;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.service.ProofImageStorageService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobProofServiceImpl implements JobProofService {
    private static final Set<ProofStatus> HISTORY_STATUSES = Set.of(
            ProofStatus.APPROVED,
            ProofStatus.REJECTED
    );

    private final JobRepository jobRepository;
    private final JobProofRepository proofRepository;
    private final UserRepository userRepository;
    private final JobAssignmentRepository assignmentRepository;
    private final JobAssignmentService assignmentService;
    private final AccountBalanceService accountBalanceService;
    private final ProofImageStorageService imageStorageService;

    public JobProofServiceImpl(
            JobRepository jobRepository,
            JobProofRepository proofRepository,
            UserRepository userRepository,
            JobAssignmentRepository assignmentRepository,
            JobAssignmentService assignmentService,
            AccountBalanceService accountBalanceService,
            ProofImageStorageService imageStorageService
    ) {
        this.jobRepository = jobRepository;
        this.proofRepository = proofRepository;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
        this.assignmentService = assignmentService;
        this.accountBalanceService = accountBalanceService;
        this.imageStorageService = imageStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FreelancerOpenJobResponse> findOpenJobs(String freelancerEmail) {
        requireUser(freelancerEmail, UserRole.FREELANCER);
        List<Job> jobs = jobRepository.findByStatusAndAvailableSlotsGreaterThanOrderByCreatedAtDesc(
                JobStatus.OPEN,
                0
        );
        if (jobs.isEmpty()) {
            return List.of();
        }

        Set<String> occupiedComments = new HashSet<>();
        assignmentRepository.findByJobInAndStatusIn(
                jobs,
                JobAssignmentServiceImpl.OCCUPIED_STATUSES
        ).stream()
                .filter(assignment -> assignment.getReviewContentIndex() != null)
                .forEach(assignment -> occupiedComments.add(commentKey(
                        assignment.getJob().getId(),
                        assignment.getReviewContentIndex()
                )));

        return jobs.stream()
                .map(job -> FreelancerOpenJobResponse.from(
                        job,
                        mapReviewContents(job, occupiedComments)
                ))
                .toList();
    }

    @Override
    @Transactional
    public JobProofResponse submit(Long jobId, SubmitJobProofRequest request, String freelancerEmail) {
        User freelancer = requireUser(freelancerEmail, UserRole.FREELANCER);
        JobAssignment assignment = assignmentService.requireClaimedForSubmit(
                request.assignmentId(),
                jobId,
                freelancer
        );
        Job job = assignment.getJob();
        ReviewContent selectedContent = selectReviewContent(job, assignment.getReviewContentIndex());

        JobProof proof = new JobProof();
        proof.setAssignment(assignment);
        proof.setJob(job);
        proof.setFreelancer(freelancer);
        proof.setReviewContentIndex(assignment.getReviewContentIndex());
        proof.setReviewContentSnapshot(selectedContent == null ? null : selectedContent.content());
        proof.setShareLink(request.shareLink() == null ? null : request.shareLink().trim());
        proof.setProofImages(request.proofImages().stream()
                .map(value -> imageStorageService.requireOwnedObjectKey(value, freelancer.getId()))
                .toList());
        proof.setStatus(ProofStatus.PENDING);
        proof.setPayoutAmount(job.getPricePerTask());
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignment.setSubmittedAt(Instant.now());

        return toResponse(proofRepository.save(proof));
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobProofResponse> findFreelancerProofs(String freelancerEmail) {
        User freelancer = requireUser(freelancerEmail, UserRole.FREELANCER);
        return proofRepository.findByFreelancerOrderByCreatedAtDesc(freelancer).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobProofResponse> findClientProofs(String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        return proofRepository.findByJobClientOrderByCreatedAtDesc(client).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobProofResponse> findClientProofHistory(String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        return proofRepository.findByJobClientAndStatusInOrderByReviewedAtDescCreatedAtDesc(
                        client,
                        HISTORY_STATUSES
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public JobProofResponse findClientProofHistoryDetail(Long proofId, String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        JobProof proof = proofRepository.findByIdAndJobClientAndStatusIn(
                        proofId,
                        client,
                        HISTORY_STATUSES
                )
                .orElseThrow(() -> new JobProofNotFoundException(proofId));
        return toResponse(proof);
    }

    @Override
    @Transactional(readOnly = true)
    public JobProofResponse findClientProof(Long proofId, String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        JobProof proof = proofRepository.findByIdAndJobClient(proofId, client)
                .orElseThrow(() -> new JobProofNotFoundException(proofId));
        return toResponse(proof);
    }

    @Override
    @Transactional
    public JobProofResponse approve(Long proofId, String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        JobProof proof = getProofForUpdate(proofId);
        requireOwnerAndPending(proof, client);
        Job job = jobRepository.findByIdForUpdate(proof.getJob().getId())
                .orElseThrow(() -> new JobValidationException("Job not found"));

        BigDecimal payout = proof.getPayoutAmount();
        if (job.getRemainingFreelancerBudget().compareTo(payout) < 0) {
            throw new JobProofConflictException("Job remaining budget is insufficient");
        }

        proof.setStatus(ProofStatus.APPROVED);
        proof.setReviewedAt(Instant.now());
        proof.getAssignment().setStatus(AssignmentStatus.APPROVED);
        proof.getAssignment().setFinishedAt(proof.getReviewedAt());
        job.setCompletedSlots(job.getCompletedSlots() + 1);
        job.setRemainingFreelancerBudget(job.getRemainingFreelancerBudget().subtract(payout));
        accountBalanceService.releaseJobReward(proof);

        if (job.getCompletedSlots().equals(job.getTotalReviews())) {
            job.setStatus(JobStatus.COMPLETED);
            accountBalanceService.settleCompletedJob(job);
            job.setRemainingFreelancerBudget(BigDecimal.ZERO.setScale(2));
        } else if (job.getAvailableSlots() > 0) {
            job.setStatus(JobStatus.OPEN);
        } else {
            job.setStatus(JobStatus.IN_PROGRESS);
        }
        return toResponse(proof);
    }

    @Override
    @Transactional
    public JobProofResponse reject(Long proofId, RejectJobProofRequest request, String clientEmail) {
        User client = requireUser(clientEmail, UserRole.CLIENT);
        JobProof proof = getProofForUpdate(proofId);
        requireOwnerAndPending(proof, client);
        Job job = jobRepository.findByIdForUpdate(proof.getJob().getId())
                .orElseThrow(() -> new JobValidationException("Job not found"));

        proof.setStatus(ProofStatus.REJECTED);
        proof.setRejectionReason(request.reason().trim());
        proof.setReviewedAt(Instant.now());
        proof.getAssignment().setStatus(AssignmentStatus.REJECTED);
        proof.getAssignment().setFinishedAt(proof.getReviewedAt());
        job.setAvailableSlots(job.getAvailableSlots() + 1);
        job.setStatus(JobStatus.OPEN);
        return toResponse(proof);
    }

    private User requireUser(String email, UserRole role) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        if (user.getRole() != role) {
            throw new AccessDeniedException("User does not have the required role");
        }
        return user;
    }

    private JobProof getProofForUpdate(Long id) {
        return proofRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new JobProofNotFoundException(id));
    }

    private static void requireOwnerAndPending(JobProof proof, User client) {
        if (!proof.getJob().getClient().getId().equals(client.getId())) {
            throw new AccessDeniedException("Only the job owner can review this proof");
        }
        if (proof.getStatus() != ProofStatus.PENDING) {
            throw new JobProofConflictException("Only pending proof can be reviewed");
        }
    }

    private static ReviewContent selectReviewContent(Job job, Integer index) {
        List<ReviewContent> contents = job.getReviewContents();
        if (contents == null || contents.isEmpty()) {
            return null;
        }
        return contents.get(index);
    }

    private static List<JobReviewContentResponse> mapReviewContents(
            Job job,
            Set<String> occupiedComments
    ) {
        if (job.getReviewContents() == null) {
            return List.of();
        }
        return java.util.stream.IntStream.range(0, job.getReviewContents().size())
                .mapToObj(index -> JobReviewContentResponse.from(
                        index,
                        job.getReviewContents().get(index),
                        !occupiedComments.contains(commentKey(job.getId(), index))
                ))
                .toList();
    }

    private static String commentKey(Long jobId, int index) {
        return jobId + ":" + index;
    }

    private JobProofResponse toResponse(JobProof proof) {
        return JobProofResponse.from(proof, proof.getProofImages().stream()
                .map(imageStorageService::createDownloadUrl)
                .toList());
    }

}
