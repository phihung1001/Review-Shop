package com.example.reviewshopbackend;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.example.reviewshopbackend.dto.request.CreateJobRequest;
import com.example.reviewshopbackend.dto.response.JobResponse;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
import com.example.reviewshopbackend.repository.JobRepository;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import com.example.reviewshopbackend.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties =
        "spring.datasource.url=jdbc:h2:mem:job_idempotency_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class JobCreationIdempotencyConcurrencyIntegrationTest {
    @Autowired UserRepository userRepository;
    @Autowired RequiredLevelRepository requiredLevelRepository;
    @Autowired JobRepository jobRepository;
    @Autowired AccountBalanceRepository balanceRepository;
    @Autowired AccountTransactionRepository transactionRepository;
    @Autowired AccountBalanceService accountBalanceService;
    @Autowired JobService jobService;

    @Test
    void concurrentRequestsWithSameKeyCreateAndFundExactlyOneJob() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User client = new User();
        client.setFullName("Idempotent Client");
        client.setEmail("idempotent-" + suffix + "@example.com");
        client.setPasswordHash("not-used");
        client.setRole(UserRole.CLIENT);
        client = userRepository.saveAndFlush(client);
        String clientEmail = client.getEmail();

        RequiredLevel level = new RequiredLevel();
        level.setDescription("Idempotency concurrency level " + suffix);
        level.setPricePerReview(new BigDecimal("10000.00"));
        level = requiredLevelRepository.saveAndFlush(level);

        accountBalanceService.creditDeposit(client, new BigDecimal("100000.00"), "IDEMPOTENCY:" + suffix);
        CreateJobRequest request = new CreateJobRequest(
                "Concurrent idempotent job",
                "Description",
                "https://www.google.com/maps/place/example",
                level.getId(),
                new BigDecimal("100000.00"),
                1,
                List.of());

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            Future<JobResponse> first = executor.submit(() -> createAfterSignal(
                    request, clientEmail, "same-key-" + suffix, ready, start));
            Future<JobResponse> second = executor.submit(() -> createAfterSignal(
                    request, clientEmail, "same-key-" + suffix, ready, start));
            ready.await();
            start.countDown();

            assertEquals(first.get().id(), second.get().id());
        } finally {
            executor.shutdownNow();
        }

        var jobs = jobRepository.findByClientOrderByCreatedAtDesc(client);
        var balance = balanceRepository.findByAccountKey("USER:" + client.getId() + ":VND").orElseThrow();
        assertEquals(1, jobs.size());
        assertEquals(BigDecimal.ZERO.setScale(2), balance.getAvailableAmount());
        assertEquals(new BigDecimal("100000.00"), balance.getHeldAmount());
        assertEquals(2, transactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(balance.getId()).size());
    }

    private JobResponse createAfterSignal(
            CreateJobRequest request,
            String email,
            String idempotencyKey,
            CountDownLatch ready,
            CountDownLatch start
    ) throws Exception {
        ready.countDown();
        start.await();
        return jobService.create(request, email, idempotencyKey);
    }
}
