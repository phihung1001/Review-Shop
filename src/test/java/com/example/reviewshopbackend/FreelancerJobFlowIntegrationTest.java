package com.example.reviewshopbackend;

import java.math.BigDecimal;
import java.time.Instant;

import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.GoogleMapsAccountType;
import com.example.reviewshopbackend.repository.GoogleMapsAccountRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FreelancerJobFlowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RequiredLevelRepository requiredLevelRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GoogleMapsAccountRepository googleMapsAccountRepository;

    @Autowired
    private AccountBalanceService accountBalanceService;

    @Autowired
    private AccountBalanceRepository accountBalanceRepository;

    @Autowired
    private AccountTransactionRepository accountTransactionRepository;

    private User freelancer;
    private String clientToken;
    private String freelancerToken;
    private Long jobId;
    private Long googleMapsAccountId;

    @BeforeEach
    void setUp() throws Exception {
        createUser("proof-client@example.com", "client-password", UserRole.CLIENT);
        freelancer = createUser("proof-freelancer@example.com", "freelancer-password", UserRole.FREELANCER);
        GoogleMapsAccount account = new GoogleMapsAccount();
        account.setFreelancer(freelancer);
        account.setContributorId("333333333333333333333");
        account.setProfileUrl("https://www.google.com/maps/contrib/333333333333333333333");
        account.setAccountName("Proof Local Guide");
        account.setLocalGuideLevel(10);
        account.setPoints(100000);
        account.setReviewCount(10);
        account.setAccountType(GoogleMapsAccountType.VIETNAM);
        account.setVerifiedAt(Instant.now());
        googleMapsAccountId = googleMapsAccountRepository.save(account).getId();
        clientToken = login("proof-client@example.com", "client-password");
        freelancerToken = login("proof-freelancer@example.com", "freelancer-password");

        RequiredLevel level = new RequiredLevel();
        level.setDescription("Freelancer level");
        level.setPricePerReview(new BigDecimal("10000.00"));
        Long levelId = requiredLevelRepository.saveAndFlush(level).getId();

        MvcResult result = mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "freelancer-flow-create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Two review job",
                                  "description": "Review this location",
                                  "mapLink": "https://www.google.com/maps/place/example",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 10000,
                                  "totalReviews": 2,
                                  "reviewContents": [
                                    {"content": "First comment", "images": []},
                                    {"content": "Second comment", "images": []}
                                  ]
                                }
                                """.formatted(levelId)))
                .andExpect(status().isCreated())
                .andReturn();
        jobId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    void freelancerSubmitsProofAndClientApprovesThenBalanceIsCredited() throws Exception {
        mockMvc.perform(get("/api/v1/freelancer/jobs/open")
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(jobId))
                .andExpect(jsonPath("$[0].reviewContents[0].content").value("First comment"))
                .andExpect(jsonPath("$[0].reviewContents[0].available").value(true));

        MvcResult submitResult = submitProof(0, "https://share.example/review/first")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reviewContent").value("First comment"))
                .andExpect(jsonPath("$.payoutAmount").value(5000))
                .andReturn();
        long proofId = readId(submitResult);

        mockMvc.perform(get("/api/v1/client/proofs")
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(proofId))
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        mockMvc.perform(get("/api/v1/client/proofs/{proofId}", proofId)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(proofId))
                .andExpect(jsonPath("$.jobId").value(jobId))
                .andExpect(jsonPath("$.jobTitle").value("Two review job"))
                .andExpect(jsonPath("$.freelancerId").value(freelancer.getId()))
                .andExpect(jsonPath("$.reviewContent").value("First comment"))
                .andExpect(jsonPath("$.shareLink").value("https://share.example/review/first"))
                .andExpect(jsonPath("$.proofImages[0]").value("https://images.example/proof.jpg"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(get("/api/v1/client/proofs/history")
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(post("/api/v1/client/proofs/{proofId}/approve", proofId)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.payoutAmount").value(5000));

        mockMvc.perform(get("/api/v1/client/proofs/history")
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(proofId))
                .andExpect(jsonPath("$[0].jobId").value(jobId))
                .andExpect(jsonPath("$[0].jobTitle").value("Two review job"))
                .andExpect(jsonPath("$[0].freelancerName").value("FREELANCER"))
                .andExpect(jsonPath("$[0].reviewContent").value("First comment"))
                .andExpect(jsonPath("$[0].status").value("APPROVED"))
                .andExpect(jsonPath("$[0].reviewedAt").isNotEmpty());

        mockMvc.perform(get("/api/v1/client/proofs/history/{proofId}", proofId)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(proofId))
                .andExpect(jsonPath("$.shareLink").value("https://share.example/review/first"))
                .andExpect(jsonPath("$.proofImages[0]").value("https://images.example/proof.jpg"))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        var freelancerBalance = accountBalanceRepository
                .findByAccountKey("USER:" + freelancer.getId() + ":VND")
                .orElseThrow();
        assertEquals(new BigDecimal("5000.00"), freelancerBalance.getAvailableAmount());
        assertEquals(1, accountTransactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(freelancerBalance.getId()).size());

        mockMvc.perform(get("/api/v1/freelancer/proofs")
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    void clientRejectsProofWithReasonAndSlotBecomesAvailableAgain() throws Exception {
        MvcResult submitResult = submitProof(1, "https://share.example/review/second")
                .andExpect(status().isCreated())
                .andReturn();
        long proofId = readId(submitResult);

        mockMvc.perform(post("/api/v1/client/proofs/{proofId}/reject", proofId)
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Ảnh chưa thể hiện review đã được đăng\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason")
                        .value("Ảnh chưa thể hiện review đã được đăng"));

        mockMvc.perform(get("/api/v1/freelancer/proofs")
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("REJECTED"))
                .andExpect(jsonPath("$[0].rejectionReason")
                        .value("Ảnh chưa thể hiện review đã được đăng"));

        mockMvc.perform(get("/api/v1/freelancer/jobs/open")
                        .header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].availableSlots").value(2))
                .andExpect(jsonPath("$[0].reviewContents[1].available").value(true));
    }

    @Test
    void freelancerCannotTakeTheSameJobWhilePreviousProofIsPending() throws Exception {
        submitProof(0, "https://share.example/review/first")
                .andExpect(status().isCreated());

        claimJob(1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Freelancer already has an active assignment for this job"));
    }

    @Test
    void freelancerCanTakeTheSameJobAgainAfterRejection() throws Exception {
        MvcResult submitResult = submitProof(0, "https://share.example/review/first")
                .andExpect(status().isCreated())
                .andReturn();
        long proofId = readId(submitResult);

        mockMvc.perform(post("/api/v1/client/proofs/{proofId}/reject", proofId)
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Proof is invalid\"}"))
                .andExpect(status().isOk());

        submitProof(1, "https://share.example/review/second")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reviewContent").value("Second comment"));
    }

    @Test
    void clientCannotReadAnotherClientsProofAndUnknownProofReturnsNotFound() throws Exception {
        long proofId = readId(submitProof(0, "https://share.example/review/private")
                .andExpect(status().isCreated())
                .andReturn());
        createUser("other-client@example.com", "other-password", UserRole.CLIENT);
        String otherClientToken = login("other-client@example.com", "other-password");

        mockMvc.perform(get("/api/v1/client/proofs/history/{proofId}", proofId)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/client/proofs/history/{proofId}", proofId)
                        .header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/client/proofs/{proofId}", proofId)
                        .header("Authorization", bearer(otherClientToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Job proof not found: " + proofId));

        mockMvc.perform(get("/api/v1/client/proofs/{proofId}", 999999L)
                        .header("Authorization", bearer(clientToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Job proof not found: 999999"));
    }

    private org.springframework.test.web.servlet.ResultActions submitProof(int commentIndex, String shareLink)
            throws Exception {
        MvcResult claimResult = claimJob(commentIndex)
                .andExpect(status().isCreated())
                .andReturn();
        long assignmentId = readId(claimResult);
        return mockMvc.perform(post("/api/v1/freelancer/jobs/{jobId}/proofs", jobId)
                .header("Authorization", bearer(freelancerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "assignmentId": %d,
                          "shareLink": "%s",
                          "proofImages": ["https://images.example/proof.jpg"]
                        }
                        """.formatted(assignmentId, shareLink)));
    }

    private org.springframework.test.web.servlet.ResultActions claimJob(int commentIndex) throws Exception {
        return mockMvc.perform(post("/api/v1/freelancer/jobs/{jobId}/assignments", jobId)
                .header("Authorization", bearer(freelancerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"reviewContentIndex": %d, "googleMapsAccountId": %d}
                        """.formatted(commentIndex, googleMapsAccountId)));
    }

    private long readId(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
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
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken")
                .asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
