package com.example.reviewshopbackend.service.impl;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.example.reviewshopbackend.dto.response.GoogleMapsAccountResponse;
import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.GoogleMapsAccountType;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.exception.GoogleMapsAccountNotFoundException;
import com.example.reviewshopbackend.exception.InvalidGoogleMapsAccountException;
import com.example.reviewshopbackend.exception.JobAssignmentConflictException;
import com.example.reviewshopbackend.repository.GoogleMapsAccountRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.GoogleMapsAccountService;
import com.example.reviewshopbackend.service.SerpApiContributorClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

@Service
public class GoogleMapsAccountServiceImpl implements GoogleMapsAccountService {
    private static final Pattern CONTRIBUTOR_PATH = Pattern.compile("^/maps/contrib/(\\d+)(?:/.*)?$");
    private final GoogleMapsAccountRepository repository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final SerpApiContributorClient contributorClient;

    public GoogleMapsAccountServiceImpl(GoogleMapsAccountRepository repository, UserRepository userRepository,
            JobRepository jobRepository, SerpApiContributorClient contributorClient) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.contributorClient = contributorClient;
    }

    @Override
    @Transactional
    public GoogleMapsAccountResponse verify(String profileUrl, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        String contributorId = extractContributorId(profileUrl);
        if (repository.existsByContributorId(contributorId)) {
            throw new JobAssignmentConflictException("Google Maps contributor profile is already registered");
        }
        SerpApiContributorClient.ContributorProfile profile = contributorClient.fetch(contributorId);
        if (profile.name() == null || profile.name().isBlank()
                || !Boolean.TRUE.equals(profile.localGuide()) || profile.level() == null || profile.level() < 1
                || profile.reviewCount() == null || profile.reviewCount() < 1) {
            throw new InvalidGoogleMapsAccountException(
                    "Google Maps account must be a Local Guide with at least one published review");
        }
        GoogleMapsAccount account = new GoogleMapsAccount();
        account.setFreelancer(freelancer);
        account.setContributorId(contributorId);
        account.setProfileUrl("https://www.google.com/maps/contrib/" + contributorId);
        account.setAccountName(profile.name());
        account.setThumbnail(profile.thumbnail());
        account.setLocalGuideLevel(profile.level());
        account.setPoints(profile.points() == null ? 0 : profile.points());
        account.setReviewCount(profile.reviewCount());
        account.setVerifiedAt(Instant.now());
        try {
            return GoogleMapsAccountResponse.from(repository.saveAndFlush(account));
        } catch (DataIntegrityViolationException exception) {
            throw new JobAssignmentConflictException("Google Maps contributor profile is already registered");
        }
    }

    @Override
    @Transactional
    public GoogleMapsAccountResponse updateType(Long id, GoogleMapsAccountType type, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        GoogleMapsAccount account = repository.findByIdAndFreelancer(id, freelancer)
                .orElseThrow(() -> new GoogleMapsAccountNotFoundException(id));
        account.setAccountType(type);
        return GoogleMapsAccountResponse.from(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GoogleMapsAccountResponse> findMine(String freelancerEmail) {
        return repository.findByFreelancerAndActiveTrueOrderByCreatedAtDesc(requireFreelancer(freelancerEmail))
                .stream().map(GoogleMapsAccountResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GoogleMapsAccountResponse> findEligibleForJob(Long jobId, String freelancerEmail) {
        User freelancer = requireFreelancer(freelancerEmail);
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new JobAssignmentConflictException("Job not found"));
        int requiredRank = job.getRequiredLevel().getRank() == null ? 1 : job.getRequiredLevel().getRank();
        return repository.findByFreelancerAndActiveTrueOrderByCreatedAtDesc(freelancer).stream()
                .filter(account -> account.getAccountType() != null)
                .filter(account -> account.getLocalGuideLevel() >= requiredRank)
                .map(GoogleMapsAccountResponse::from).toList();
    }

    static String extractContributorId(String profileUrl) {
        try {
            URI uri = new URI(profileUrl.trim());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null
                    || !(host.equalsIgnoreCase("google.com") || host.equalsIgnoreCase("www.google.com"))) {
                throw invalidUrl();
            }
            Matcher matcher = CONTRIBUTOR_PATH.matcher(uri.getPath());
            if (!matcher.matches()) throw invalidUrl();
            return matcher.group(1);
        } catch (URISyntaxException exception) {
            throw invalidUrl();
        }
    }

    private User requireFreelancer(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
        if (user.getRole() != UserRole.FREELANCER) throw new AccessDeniedException("User does not have the required role");
        return user;
    }

    private static IllegalArgumentException invalidUrl() {
        return new IllegalArgumentException("A valid Google Maps contributor profile URL is required");
    }
}
