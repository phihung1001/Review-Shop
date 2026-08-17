package com.example.reviewshopbackend;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClientJobQueryIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RequiredLevelRepository requiredLevelRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;
    @Autowired AccountBalanceService accountBalanceService;

    private Long requiredLevelId;

    @BeforeEach
    void setUp() {
        RequiredLevel level = new RequiredLevel();
        level.setDescription("Client query level");
        level.setPricePerReview(new BigDecimal("10000.00"));
        requiredLevelId = requiredLevelRepository.saveAndFlush(level).getId();
    }

    @Test
    void clientListsOnlyOwnJobsAndViewsOwnedJobDetails() throws Exception {
        createUser("owner@example.com", UserRole.CLIENT);
        createUser("other@example.com", UserRole.CLIENT);
        String ownerToken = login("owner@example.com");
        String otherToken = login("other@example.com");
        long ownerJobId = createJob(ownerToken, "Owner job");
        createJob(otherToken, "Other job");

        mockMvc.perform(get("/api/v1/jobs").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(ownerJobId))
                .andExpect(jsonPath("$[0].title").value("Owner job"));

        mockMvc.perform(get("/api/v1/jobs/{id}", ownerJobId).header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ownerJobId))
                .andExpect(jsonPath("$.description").value("Description for Owner job"))
                .andExpect(jsonPath("$.requiredLevel.id").value(requiredLevelId));
    }

    @Test
    void clientCannotViewAnotherClientsJob() throws Exception {
        createUser("owner2@example.com", UserRole.CLIENT);
        createUser("other2@example.com", UserRole.CLIENT);
        String ownerToken = login("owner2@example.com");
        String otherToken = login("other2@example.com");
        long ownerJobId = createJob(ownerToken, "Private job");

        mockMvc.perform(get("/api/v1/jobs/{id}", ownerJobId).header("Authorization", bearer(otherToken)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Job not found with ID: " + ownerJobId));
    }

    @Test
    void jobQueriesRequireAuthenticatedClient() throws Exception {
        createUser("freelancer-query@example.com", UserRole.FREELANCER);
        String freelancerToken = login("freelancer-query@example.com");

        mockMvc.perform(get("/api/v1/jobs"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/jobs").header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isForbidden());
    }

    private void createUser(String email, UserRole role) {
        User user = new User();
        user.setFullName(role.name());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("password"));
        user.setRole(role);
        User saved = userRepository.saveAndFlush(user);
        if (role == UserRole.CLIENT) {
            accountBalanceService.creditDeposit(saved, new BigDecimal("1000000.00"), "TEST:" + saved.getId());
        }
    }

    private String login(String email) throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private long createJob(String token, String title) throws Exception {
        String body = mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(token))
                        .header("Idempotency-Key", "client-job-query-create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "Description for %s",
                                  "mapLink": "https://www.google.com/maps/place/example",
                                  "requiredLevelId": %d,
                                  "pricePerReview": 10000,
                                  "totalReviews": 1
                                }
                                """.formatted(title, title, requiredLevelId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(body);
        return response.get("id").asLong();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
