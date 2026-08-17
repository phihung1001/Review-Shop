package com.example.reviewshopbackend;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RequiredLevelIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void adminCanCreateReadUpdateAndDeleteRequiredLevel() throws Exception {
        createUser("level-admin@example.com", "admin-password", UserRole.ADMIN);
        String adminToken = login("level-admin@example.com", "admin-password");

        MvcResult createResult = mockMvc.perform(post("/api/v1/required-levels")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Tài khoản cấp 1 đến 3",
                                  "pricePerReview": 10000
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Tài khoản cấp 1 đến 3"))
                .andExpect(jsonPath("$.pricePerReview").value(10000))
                .andReturn();

        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long id = created.get("id").asLong();

        mockMvc.perform(get("/api/v1/required-levels")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id));

        mockMvc.perform(put("/api/v1/required-levels/{id}", id)
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Mô tả đã cập nhật",
                                  "pricePerReview": 12000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Mô tả đã cập nhật"))
                .andExpect(jsonPath("$.pricePerReview").value(12000));

        mockMvc.perform(delete("/api/v1/required-levels/{id}", id)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/required-levels/{id}", id)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void requiredLevelsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/required-levels"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nonAdminCannotMutateRequiredLevelsAndInvalidPriceIsRejected() throws Exception {
        createUser("level-client@example.com", "client-password", UserRole.CLIENT);
        createUser("second-level-admin@example.com", "admin-password", UserRole.ADMIN);
        String clientToken = login("level-client@example.com", "client-password");
        String adminToken = login("second-level-admin@example.com", "admin-password");

        mockMvc.perform(post("/api/v1/required-levels")
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/required-levels")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Level 4-6\",\"pricePerReview\":0}"))
                .andExpect(status().isBadRequest());
    }

    private User createUser(String email, String password, UserRole role) {
        User user = new User();
        user.setFullName(role.name());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        return userRepository.save(user);
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken")
                .asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String validRequest() {
        return "{\"description\":\"Level 1-3\",\"pricePerReview\":10000}";
    }
}
