package com.example.reviewshopbackend;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.GoogleMapsAccountType;
import com.example.reviewshopbackend.repository.GoogleMapsAccountRepository;
import com.example.reviewshopbackend.repository.JobAssignmentRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.JobAssignmentService;
import com.example.reviewshopbackend.service.AccountBalanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobAssignmentIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RequiredLevelRepository requiredLevelRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private JobAssignmentRepository assignmentRepository;
    @Autowired private JobAssignmentService assignmentService;
    @Autowired private GoogleMapsAccountRepository googleMapsAccountRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AccountBalanceService accountBalanceService;

    private String freelancerToken;
    private String anotherFreelancerToken;
    private Long jobId;
    private Long freelancerAccountId;
    private Long anotherAccountId;

    @BeforeEach
    void setUp() throws Exception {
        createUser("assignment-client@example.com", "client-password", UserRole.CLIENT);
        User freelancer = createUser("assignment-freelancer@example.com", "freelancer-password", UserRole.FREELANCER);
        User another = createUser("assignment-other@example.com", "freelancer-password", UserRole.FREELANCER);
        freelancerAccountId = createGoogleAccount(freelancer, "111111111111111111111");
        anotherAccountId = createGoogleAccount(another, "222222222222222222222");
        String clientToken = login("assignment-client@example.com", "client-password");
        freelancerToken = login("assignment-freelancer@example.com", "freelancer-password");
        anotherFreelancerToken = login("assignment-other@example.com", "freelancer-password");

        RequiredLevel level = new RequiredLevel();
        level.setDescription("Assignment level");
        level.setRank(5);
        level.setPricePerReview(new BigDecimal("10000.00"));
        long levelId = requiredLevelRepository.saveAndFlush(level).getId();

        MvcResult result = mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "assignment-create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Ten slot job",
                                  "description": "Assignment integration test",
                                  "mapLink": "https://www.google.com/maps/place/assignment",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 10000,
                                  "totalReviews": 10,
                                  "reviewContents": [
                                    {"content": "Comment 0", "images": []},
                                    {"content": "Comment 1", "images": []},
                                    {"content": "Comment 2", "images": []},
                                    {"content": "Comment 3", "images": []},
                                    {"content": "Comment 4", "images": []},
                                    {"content": "Comment 5", "images": []},
                                    {"content": "Comment 6", "images": []},
                                    {"content": "Comment 7", "images": []},
                                    {"content": "Comment 8", "images": []},
                                    {"content": "Comment 9", "images": []}
                                  ]
                                }
                                """.formatted(levelId)))
                .andExpect(status().isCreated())
                .andReturn();
        jobId = readId(result);
    }

    @Test
    void claimReservesExactlyOneOfTenSlotsAndAppearsInMyAssignments() throws Exception {
        MvcResult result = claim(0, freelancerToken)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CLAIMED"))
                .andExpect(jsonPath("$.reviewContentIndex").value(0))
                .andExpect(jsonPath("$.jobDescription").value("Assignment integration test"))
                .andExpect(jsonPath("$.mapLink").value("https://www.google.com/maps/place/assignment"))
                .andExpect(jsonPath("$.payoutPerTask").value(5000.0))
                .andExpect(jsonPath("$.reviewContent").value("Comment 0"))
                .andExpect(jsonPath("$.reviewContentImages").isArray())
                .andExpect(jsonPath("$.freelancerId").doesNotExist())
                .andReturn();

        Job job = jobRepository.findById(jobId).orElseThrow();
        assertEquals(9, job.getAvailableSlots());

        mockMvc.perform(get("/api/v1/freelancer/assignments")
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(readId(result)))
                .andExpect(jsonPath("$[0].status").value("CLAIMED"))
                .andExpect(jsonPath("$[0].payoutPerTask").value(5000.0))
                .andExpect(jsonPath("$[0].jobDescription").doesNotExist());

        mockMvc.perform(get("/api/v1/freelancer/assignments/{id}", readId(result))
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(readId(result)))
                .andExpect(jsonPath("$.jobDescription").value("Assignment integration test"))
                .andExpect(jsonPath("$.reviewContent").value("Comment 0"));
    }

    @Test
    void anotherFreelancerCannotClaimTheSameReviewContent() throws Exception {
        claim(0, freelancerToken).andExpect(status().isCreated());

        claim(0, anotherFreelancerToken)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Review content has already been assigned"));

        assertEquals(9, jobRepository.findById(jobId).orElseThrow().getAvailableSlots());
    }

    @Test
    void cancellingClaimReturnsSlot() throws Exception {
        long assignmentId = readId(claim(1, freelancerToken)
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(delete("/api/v1/freelancer/assignments/{id}", assignmentId)
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isNoContent());

        JobAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        assertEquals(AssignmentStatus.CANCELLED, assignment.getStatus());
        assertEquals(10, jobRepository.findById(jobId).orElseThrow().getAvailableSlots());
    }

    @Test
    void expiredClaimIsReleasedByCleanup() throws Exception {
        long assignmentId = readId(claim(2, freelancerToken)
                .andExpect(status().isCreated())
                .andReturn());
        JobAssignment assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        assignment.setExpiresAt(Instant.now().minusSeconds(1));
        assignmentRepository.saveAndFlush(assignment);

        assignmentService.expireAssignments();

        assertEquals(AssignmentStatus.EXPIRED,
                assignmentRepository.findById(assignmentId).orElseThrow().getStatus());
        assertEquals(10, jobRepository.findById(jobId).orElseThrow().getAvailableSlots());
    }

    @Test
    void proofSubmissionUsesAssignmentAndDoesNotDecreaseSlotTwice() throws Exception {
        long assignmentId = readId(claim(3, freelancerToken)
                .andExpect(status().isCreated())
                .andReturn());

        mockMvc.perform(post("/api/v1/freelancer/jobs/{jobId}/proofs", jobId)
                        .header("Authorization", bearer(freelancerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "assignmentId": %d,
                                  "shareLink": "https://share.example/assignment-proof",
                                  "proofImages": ["https://images.example/proof.jpg"]
                                }
                                """.formatted(assignmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentId").value(assignmentId))
                .andExpect(jsonPath("$.reviewContentIndex").value(3));

        assertEquals(AssignmentStatus.SUBMITTED,
                assignmentRepository.findById(assignmentId).orElseThrow().getStatus());
        assertEquals(9, jobRepository.findById(jobId).orElseThrow().getAvailableSlots());
    }

    @Test
    void eligibilityEndpointReturnsOnlyAccountsMeetingJobLevelAndClaimRechecksSelection() throws Exception {
        User freelancer = userRepository.findByEmail("assignment-freelancer@example.com").orElseThrow();
        long lowLevelAccountId = createGoogleAccount(freelancer, "444444444444444444444", 4);

        mockMvc.perform(get("/api/v1/freelancer/jobs/{jobId}/eligible-google-maps-accounts", jobId)
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(freelancerAccountId));

        mockMvc.perform(post("/api/v1/freelancer/jobs/{jobId}/assignments", jobId)
                        .header("Authorization", bearer(freelancerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reviewContentIndex\":5,\"googleMapsAccountId\":" + lowLevelAccountId + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        "Selected Google Maps account level is lower than the job required level"));
    }

    private org.springframework.test.web.servlet.ResultActions claim(int index, String token) throws Exception {
        long accountId = token.equals(freelancerToken) ? freelancerAccountId : anotherAccountId;
        return mockMvc.perform(post("/api/v1/freelancer/jobs/{jobId}/assignments", jobId)
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reviewContentIndex\":" + index + ",\"googleMapsAccountId\":" + accountId + "}"));
    }

    private long createGoogleAccount(User freelancer, String contributorId) {
        return createGoogleAccount(freelancer, contributorId, 10);
    }

    private long createGoogleAccount(User freelancer, String contributorId, int level) {
        GoogleMapsAccount account = new GoogleMapsAccount();
        account.setFreelancer(freelancer);
        account.setContributorId(contributorId);
        account.setProfileUrl("https://www.google.com/maps/contrib/" + contributorId);
        account.setAccountName("Test Local Guide");
        account.setLocalGuideLevel(level);
        account.setPoints(100000);
        account.setReviewCount(10);
        account.setAccountType(GoogleMapsAccountType.VIETNAM);
        account.setVerifiedAt(Instant.now());
        return googleMapsAccountRepository.save(account).getId();
    }

    private User createUser(String email, String password, UserRole role) {
        User user = new User();
        user.setFullName(role.name());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        User saved = userRepository.saveAndFlush(user);
        if (role == UserRole.CLIENT) {
            accountBalanceService.creditDeposit(saved, new BigDecimal("1000000.00"), "TEST:" + saved.getId());
        }
        return saved;
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private long readId(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
