package com.example.reviewshopbackend;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.Cookie;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JwtAuthenticationIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void loginReturnsJwtAndBasicAuthenticationIsDisabled() throws Exception {
        User admin = new User();
        admin.setFullName("Admin");
        admin.setEmail("jwt-admin@example.com");
        admin.setPasswordHash(passwordEncoder.encode("admin-password"));
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "jwt-admin@example.com",
                                  "password": "admin-password"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.email").value("jwt-admin@example.com"))
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");
        Cookie csrfCookie = loginResult.getResponse().getCookie("csrf_token");
        assertNotNull(refreshCookie);
        assertNotNull(csrfCookie);
        assertTrue(refreshCookie.isHttpOnly());
        assertFalse(refreshCookie.getSecure());
        assertTrue(loginResult.getResponse().getHeader("Set-Cookie").contains("SameSite=Strict"));

        String accessToken = tools.jackson.databind.json.JsonMapper.shared()
                .readTree(loginResult.getResponse().getContentAsString())
                .get("accessToken")
                .asText();

        mockMvc.perform(get("/api/v1/admin/platform-settings")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        admin.setAuthVersion(1);
        userRepository.flush();
        mockMvc.perform(get("/api/v1/admin/platform-settings")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/admin/platform-settings")
                        .with(httpBasic("jwt-admin@example.com", "admin-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("WWW-Authenticate"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        mockMvc.perform(get("/api/v1/admin/platform-settings")
                        .header("Authorization", "Bearer " + accessToken + "tampered"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie, csrfCookie))
                .andExpect(status().isForbidden());

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie, csrfCookie)
                        .header("X-CSRF-Token", csrfCookie.getValue()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();
        Cookie rotatedCookie = refreshResult.getResponse().getCookie("refresh_token");
        Cookie rotatedCsrfCookie = refreshResult.getResponse().getCookie("csrf_token");
        assertNotNull(rotatedCookie);
        assertNotNull(rotatedCsrfCookie);
        assertNotEquals(refreshCookie.getValue(), rotatedCookie.getValue());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie, csrfCookie)
                        .header("X-CSRF-Token", csrfCookie.getValue()))
                .andExpect(status().isUnauthorized());

        // Reusing an old token revokes its entire rotation family.
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(rotatedCookie, rotatedCsrfCookie)
                        .header("X-CSRF-Token", rotatedCsrfCookie.getValue()))
                .andExpect(status().isUnauthorized());

        MvcResult secondLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"jwt-admin@example.com","password":"admin-password"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        Cookie logoutRefresh = secondLogin.getResponse().getCookie("refresh_token");
        Cookie logoutCsrf = secondLogin.getResponse().getCookie("csrf_token");
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(logoutRefresh, logoutCsrf)
                        .header("X-CSRF-Token", logoutCsrf.getValue()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(logoutRefresh, logoutCsrf)
                        .header("X-CSRF-Token", logoutCsrf.getValue()))
                .andExpect(status().isUnauthorized());
    }
}
