package com.example.reviewshopbackend;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobFlowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private RequiredLevelRepository requiredLevelRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AccountBalanceService accountBalanceService;

    private Long requiredLevelId;

    @BeforeEach
    void createRequiredLevel() {
        RequiredLevel requiredLevel = new RequiredLevel();
        requiredLevel.setDescription("Account level from 1 to 3");
        requiredLevel.setPricePerReview(new BigDecimal("10000.00"));
        requiredLevelId = requiredLevelRepository.saveAndFlush(requiredLevel).getId();
    }

    @Test
    void adminControlsFeeAndAuthenticatedClientCreatesJobFromGrossBudget() throws Exception {
        createUser("admin@example.com", "admin-password", UserRole.ADMIN);
        User client = createUser("client@example.com", "client-password", UserRole.CLIENT);
        String adminToken = login("admin@example.com", "admin-password");
        String clientToken = login("client@example.com", "client-password");

        mockMvc.perform(put("/api/v1/admin/platform-settings/fee-rate")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"platformFeeRate\": 0.5000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.platformFeeRate").value(0.5))
                .andExpect(jsonPath("$.updatedBy").value("admin@example.com"));

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "job-flow-invalid-map")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Review job",
                                  "description": "Review all requested locations",
                                  "linkUrlMap": "https://www.google.com/maps/place/example",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 100000,
                                  "totalReviews": 1,
                                  "status": "COMPLETED"
                                }
                                """.formatted(requiredLevelId)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "job-flow-success")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"));

        Job savedJob = jobRepository.findAll().getFirst();
        assertEquals(new BigDecimal("0.5000"), savedJob.getPlatformFeeRate());
        assertEquals(new BigDecimal("50000.00"), savedJob.getPlatformFeeAmount());
        assertEquals(new BigDecimal("50000.00"), savedJob.getFreelancerBudget());
    }

    @Test
    void freelancerCannotCreateJobAndClientCannotChangeAdminSettings() throws Exception {
        createUser("freelancer@example.com", "freelancer-password", UserRole.FREELANCER);
        createUser("client2@example.com", "client-password", UserRole.CLIENT);
        String freelancerToken = login("freelancer@example.com", "freelancer-password");
        String clientToken = login("client2@example.com", "client-password");

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(freelancerToken))
                        .header("Idempotency-Key", "job-flow-forbidden")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/admin/platform-settings/fee-rate")
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"platformFeeRate\": 0.1000}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void clientCreatesJobUsingReviewSpecificFields() throws Exception {
        createUser("review-client@example.com", "client-password", UserRole.CLIENT);
        String clientToken = login("review-client@example.com", "client-password");

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "job-flow-price-too-low")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Google Maps review",
                                  "description": "Review the requested location",
                                  "mapLink": "https://www.google.com/maps/place/example",
                                  "pricePerReview": 10000,
                                  "requiredLevelId": %d,
                                  "totalReviews": 2,
                                  "reviewContents": [
                                    {"content": "First review", "images": []},
                                    {"content": "", "images": ["https://images.example/photo.jpg"]}
                                  ]
                                }
                                """.formatted(requiredLevelId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mapLink").value("https://www.google.com/maps/place/example"))
                .andExpect(jsonPath("$.pricePerReview").value(10000))
                .andExpect(jsonPath("$.requiredLevel.id").value(requiredLevelId))
                .andExpect(jsonPath("$.requiredLevel.description").value("Account level from 1 to 3"))
                .andExpect(jsonPath("$.requiredLevel.pricePerReview").value(10000))
                .andExpect(jsonPath("$.requiredReviews").value(2))
                .andExpect(jsonPath("$.reviewContents[0].content").value("First review"))
                .andExpect(jsonPath("$.reviewContents[1].images[0]")
                        .value("https://images.example/photo.jpg"))
                .andExpect(jsonPath("$.pricePerTask").value(5000));

        Job savedJob = jobRepository.findAll().getFirst();
        assertEquals(requiredLevelId, savedJob.getRequiredLevel().getId());
        assertEquals(2, savedJob.getReviewContents().size());
    }

    @Test
    void rejectsJobWhenPricePerReviewIsBelowRequiredLevelMinimum() throws Exception {
        createUser("price-client@example.com", "client-password", UserRole.CLIENT);
        String clientToken = login("price-client@example.com", "client-password");

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "job-flow-invalid-level")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Underpriced review job",
                                  "description": "Description",
                                  "mapLink": "https://www.google.com/maps/place/example",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 9999,
                                  "totalReviews": 1
                                }
                                """.formatted(requiredLevelId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Price per review must be greater than or equal to 10000.00 for required level ID "
                                + requiredLevelId
                ));
    }

    @Test
    void rejectsJobWhenMapLinkIsNotGoogleMapsUrl() throws Exception {
        createUser("map-client@example.com", "client-password", UserRole.CLIENT);
        String clientToken = login("map-client@example.com", "client-password");

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "job-flow-zero-task-price")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Invalid map job",
                                  "description": "Description",
                                  "mapLink": "https://google.com.evil.example/maps/place/test",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 10000,
                                  "totalReviews": 1
                                }
                                """.formatted(requiredLevelId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("mapLink: mapLink must be a valid Google Maps URL"));
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

    private String validJobJson() {
        return """
                {
                  "title": "Review job",
                  "description": "Description",
                  "linkUrlMap": "https://www.google.com/maps/place/example",
                  "requiredLevelId": %d,
                  "pricePerReview": 100000,
                  "totalReviews": 1
                }
                """.formatted(requiredLevelId);
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
