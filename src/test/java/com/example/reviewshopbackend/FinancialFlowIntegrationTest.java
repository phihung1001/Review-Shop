package com.example.reviewshopbackend;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.DepositOrder;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.DepositService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FinancialFlowIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RequiredLevelRepository requiredLevelRepository;
    @Autowired AccountBalanceRepository balanceRepository;
    @Autowired AccountTransactionRepository transactionRepository;
    @Autowired JobRepository jobRepository;
    @Autowired DepositService depositService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private User client;
    private String clientToken;
    private Long requiredLevelId;

    @BeforeEach
    void setUp() throws Exception {
        client = new User();
        client.setFullName("Client");
        client.setEmail("money-client@example.com");
        client.setPasswordHash(passwordEncoder.encode("client-password"));
        client.setRole(UserRole.CLIENT);
        client = userRepository.saveAndFlush(client);
        clientToken = login();

        RequiredLevel level = new RequiredLevel();
        level.setDescription("Financial test level");
        level.setPricePerReview(new BigDecimal("10000.00"));
        requiredLevelId = requiredLevelRepository.saveAndFlush(level).getId();
    }

    @Test
    void pendingDepositDoesNotCreditBalanceAndProviderConfirmationIsIdempotent() throws Exception {
        String response = mockMvc.perform(post("/api/v1/client/account/deposits")
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 100000,
                                  "provider": "test-provider",
                                  "idempotencyKey": "client-request-1"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();

        Long depositId = objectMapper.readTree(response).get("id").asLong();
        DepositOrder confirmed = depositService.confirm(
                depositId, new BigDecimal("100000.00"), "provider-payment-1");
        depositService.confirm(depositId, new BigDecimal("100000.00"), "provider-payment-1");

        var balance = balanceRepository.findByAccountKey("USER:" + client.getId() + ":VND").orElseThrow();
        assertEquals(new BigDecimal("100000.00"), balance.getAvailableAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), balance.getHeldAmount());
        assertEquals(1, transactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(balance.getId()).size());
        assertEquals("provider-payment-1", confirmed.getProviderReference());
    }

    @Test
    void creatingJobWithoutFundsIsRejectedAndRolledBack() throws Exception {
        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "financial-insufficient")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value("Client available balance is insufficient to fund this job"));
    }

    @Test
    void creatingFundedJobAtomicallyMovesAvailableMoneyToHeldMoney() throws Exception {
        DepositOrder deposit = depositService.create(
                client.getEmail(), new BigDecimal("100000.00"), "TEST", "fund-job");
        depositService.confirm(deposit.getId(), new BigDecimal("100000.00"), "provider-fund-job");

        String firstResponse = mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "financial-funded")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String replayResponse = mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "financial-funded")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        var balance = balanceRepository.findByAccountKey("USER:" + client.getId() + ":VND").orElseThrow();
        assertEquals(objectMapper.readTree(firstResponse).get("id").asLong(),
                objectMapper.readTree(replayResponse).get("id").asLong());
        assertEquals(1, jobRepository.findByClientOrderByCreatedAtDesc(client).size());
        assertEquals(BigDecimal.ZERO.setScale(2), balance.getAvailableAmount());
        assertEquals(new BigDecimal("100000.00"), balance.getHeldAmount());
        assertEquals(2, transactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(balance.getId()).size());
    }

    @Test
    void reusingJobIdempotencyKeyWithDifferentPayloadIsRejected() throws Exception {
        DepositOrder deposit = depositService.create(
                client.getEmail(), new BigDecimal("200000.00"), "TEST", "fund-conflict-job");
        depositService.confirm(deposit.getId(), new BigDecimal("200000.00"), "provider-fund-conflict-job");

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "financial-conflict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson()))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/jobs")
                        .header("Authorization", bearer(clientToken))
                        .header("Idempotency-Key", "financial-conflict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJobJson().replace("Funded job", "Different job")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Idempotency-Key was already used with a different job request"));

        assertEquals(1, jobRepository.findByClientOrderByCreatedAtDesc(client).size());
    }

    private String validJobJson() {
        return """
                {
                  "title": "Funded job",
                  "description": "Description",
                  "mapLink": "https://www.google.com/maps/place/example",
                  "requiredLevelId": %d,
                  "pricePerReview": 100000,
                  "totalReviews": 1
                }
                """.formatted(requiredLevelId);
    }

    private String login() throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"money-client@example.com","password":"client-password"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
