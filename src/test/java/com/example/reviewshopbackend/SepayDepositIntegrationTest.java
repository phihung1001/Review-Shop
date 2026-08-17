package com.example.reviewshopbackend;

import java.math.BigDecimal;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
import com.example.reviewshopbackend.repository.UserRepository;
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

@SpringBootTest(properties = {
        "app.sepay.enabled=true",
        "app.sepay.webhook-api-key=test-sepay-key",
        "app.sepay.bank-account=123456789",
        "app.sepay.bank-code=VCB",
        "app.sepay.account-holder=TEST ACCOUNT",
        "app.sepay.payment-code-prefix=SEPAY",
        "app.sepay.webhook-bank-account=123456789"
})
@AutoConfigureMockMvc
@Transactional
class SepayDepositIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired AccountBalanceRepository balanceRepository;
    @Autowired AccountTransactionRepository transactionRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private User client;
    private String clientToken;

    @BeforeEach
    void setUp() throws Exception {
        client = new User();
        client.setFullName("SePay Client");
        client.setEmail("sepay-client@example.com");
        client.setPasswordHash(passwordEncoder.encode("client-password"));
        client.setRole(UserRole.CLIENT);
        client = userRepository.saveAndFlush(client);
        clientToken = login();
    }

    @Test
    void createsPaymentInstructionAndCreditsOnlyOnceFromSePayWebhook() throws Exception {
        String createResponse = mockMvc.perform(post("/api/v1/client/account/deposits")
                        .header("Authorization", bearer(clientToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 250000,
                                  "provider": "SEPAY",
                                  "idempotencyKey": "sepay-request-1"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.payment.paymentCode").isString())
                .andExpect(jsonPath("$.payment.bankAccount").value("123456789"))
                .andReturn().getResponse().getContentAsString();

        String paymentCode = objectMapper.readTree(createResponse)
                .get("payment").get("paymentCode").asText();

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookJson(paymentCode)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test-sepay-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookJson(paymentCode)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/v1/webhooks/sepay")
                        .header("Authorization", "Apikey test-sepay-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookJson(paymentCode)))
                .andExpect(status().isOk());

        var balance = balanceRepository.findByAccountKey("USER:" + client.getId() + ":VND").orElseThrow();
        assertEquals(new BigDecimal("250000.00"), balance.getAvailableAmount());
        assertEquals(1, transactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(balance.getId()).size());
    }

    private String webhookJson(String paymentCode) {
        return """
                {
                  "id": 92704,
                  "accountNumber": "123456789",
                  "code": "%s",
                  "content": "%s chuyen tien",
                  "transferType": "in",
                  "transferAmount": 250000,
                  "referenceCode": "FT24012345678"
                }
                """.formatted(paymentCode, paymentCode);
    }

    private String login() throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"sepay-client@example.com","password":"client-password"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
