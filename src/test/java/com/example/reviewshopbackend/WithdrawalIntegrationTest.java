package com.example.reviewshopbackend;

import java.math.BigDecimal;
import com.example.reviewshopbackend.entity.*;
import com.example.reviewshopbackend.repository.*;
import com.example.reviewshopbackend.service .AccountBalanceService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WithdrawalIntegrationTest {
    @Autowired MockMvc mockMvc; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper mapper; @Autowired AccountBalanceService balances;
    @Autowired AccountBalanceRepository balanceRepository; @Autowired AccountTransactionRepository transactions;
    @Autowired PayoutMethodRepository payoutMethods; @Autowired WithdrawalRepository withdrawals;
    private User freelancer; private String freelancerToken; private String adminToken; private Long payoutMethodId;

    @BeforeEach
    void setUp() throws Exception {
        freelancer = user("withdraw-freelancer@example.com", UserRole.FREELANCER);
        user("withdraw-admin@example.com", UserRole.ADMIN);
        freelancerToken = login("withdraw-freelancer@example.com"); adminToken = login("withdraw-admin@example.com");
        balances.creditDeposit(freelancer, new BigDecimal("300000.00"), "withdrawal-test-credit");
        String body = mockMvc.perform(post("/api/v1/freelancer/payout-methods")
                        .header("Authorization", bearer(freelancerToken)).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"BANK_ACCOUNT","bankCode":"VCB","bankName":"Vietcombank",
                                 "accountNumber":"0123456789","accountHolderName":"Nguyen Van A",
                                 "qrImageObjectKey":"payout-methods/%d/test-qr.png","isDefault":true}
                                """.formatted(freelancer.getId())))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.maskedAccountNumber").value("******6789"))
                .andExpect(jsonPath("$.qrImageUrl").isNotEmpty()).andReturn().getResponse().getContentAsString();
        payoutMethodId = mapper.readTree(body).get("id").asLong();
    }

    @Test
    void qrUploadAcceptsFileSizeFieldFromFrontendContract() throws Exception {
        mockMvc.perform(post("/api/v1/freelancer/payout-method-images/uploads")
                        .header("Authorization", bearer(freelancerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"bank-qr.png\",\"contentType\":\"image/png\",\"fileSize\":1024}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.objectKey").value(org.hamcrest.Matchers.startsWith(
                        "payout-methods/" + freelancer.getId() + "/")))
                .andExpect(jsonPath("$.uploadUrl").isNotEmpty());

        mockMvc.perform(post("/api/v1/freelancer/payout-method-images/uploads")
                        .header("Authorization", bearer(freelancerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"bank-qr.png\",\"contentType\":\"image/png\",\"size\":1024}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void payoutMethodStoresEncryptedAccountAndWithdrawalCompletesExactlyOnce() throws Exception {
        assertNotEquals("0123456789", payoutMethods.findById(payoutMethodId).orElseThrow().getAccountNumberEncrypted());
        String created = createWithdrawal("wd-success", "150000");
        long id = mapper.readTree(created).get("id").asLong();
        assertBalance("150000.00", "150000.00");

        mockMvc.perform(post("/api/v1/admin/withdrawals/{id}/approve", id).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PROCESSING"));
        mockMvc.perform(post("/api/v1/admin/withdrawals/{id}/complete", id).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":\"MANUAL_BANK\",\"providerReference\":\"BANK-001\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.netAmount").value(145000));
        assertBalance("150000.00", "0.00");
        assertEquals(3, transactions.findByAccountBalanceIdOrderByCreatedAtDesc(account().getId()).size());
    }

    @Test
    void cancellationReleasesHeldMoneyAndIdempotencyReplayDoesNotHoldTwice() throws Exception {
        String first = createWithdrawal("wd-cancel", "100000");
        String replay = createWithdrawal("wd-cancel", "100000");
        assertEquals(mapper.readTree(first).get("id").asLong(), mapper.readTree(replay).get("id").asLong());
        long id = mapper.readTree(first).get("id").asLong(); assertBalance("200000.00", "100000.00");
        mockMvc.perform(post("/api/v1/freelancer/withdrawals/{id}/cancel", id).header("Authorization", bearer(freelancerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertBalance("300000.00", "0.00");
    }

    @Test
    void activeWithdrawalBlocksAnotherAndAdminRejectionReleasesMoney() throws Exception {
        String created = createWithdrawal("wd-reject", "100000"); long id = mapper.readTree(created).get("id").asLong();
        mockMvc.perform(post("/api/v1/freelancer/withdrawals").header("Authorization", bearer(freelancerToken))
                        .header("Idempotency-Key", "wd-second").contentType(MediaType.APPLICATION_JSON)
                        .content(withdrawalJson("100000")))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/v1/admin/withdrawals/{id}/reject", id).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Invalid bank account\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        assertBalance("300000.00", "0.00");
    }

    private String createWithdrawal(String key, String amount) throws Exception {
        return mockMvc.perform(post("/api/v1/freelancer/withdrawals").header("Authorization", bearer(freelancerToken))
                        .header("Idempotency-Key", key).contentType(MediaType.APPLICATION_JSON).content(withdrawalJson(amount)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
    }
    private String withdrawalJson(String amount) { return "{\"amount\":" + amount + ",\"currency\":\"VND\",\"payoutMethodId\":" + payoutMethodId + "}"; }
    private User user(String email, UserRole role) { User value = new User(); value.setFullName(role.name()); value.setEmail(email); value.setPasswordHash(encoder.encode("password-123")); value.setRole(role); return users.saveAndFlush(value); }
    private String login(String email) throws Exception { String body = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + email + "\",\"password\":\"password-123\"}" )).andExpect(status().isOk()).andReturn().getResponse().getContentAsString(); return mapper.readTree(body).get("accessToken").asText(); }
    private AccountBalance account() { return balanceRepository.findByAccountKey("USER:" + freelancer.getId() + ":VND").orElseThrow(); }
    private void assertBalance(String available, String held) { assertEquals(new BigDecimal(available), account().getAvailableAmount()); assertEquals(new BigDecimal(held), account().getHeldAmount()); }
    private static String bearer(String token) { return "Bearer " + token; }
}
