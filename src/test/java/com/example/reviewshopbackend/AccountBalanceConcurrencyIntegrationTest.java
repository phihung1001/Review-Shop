package com.example.reviewshopbackend;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.example.reviewshopbackend.entity.User;
import com.example.reviewshopbackend.entity.UserRole;
import com.example.reviewshopbackend.repository.AccountBalanceRepository;
import com.example.reviewshopbackend.repository.AccountTransactionRepository;
import com.example.reviewshopbackend.repository.UserRepository;
import com.example.reviewshopbackend.service.AccountBalanceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class AccountBalanceConcurrencyIntegrationTest {
    @Autowired UserRepository userRepository;
    @Autowired AccountBalanceRepository balanceRepository;
    @Autowired AccountTransactionRepository transactionRepository;
    @Autowired AccountBalanceService accountBalanceService;

    @Test
    void concurrentCreditsAreSerializedWithoutLostUpdates() throws Exception {
        User user = new User();
        user.setFullName("Concurrent Freelancer");
        user.setEmail("concurrent-balance@example.com");
        user.setPasswordHash("not-used");
        user.setRole(UserRole.FREELANCER);
        user = userRepository.saveAndFlush(user);
        accountBalanceService.getOrCreate(user);

        int credits = 12;
        CountDownLatch ready = new CountDownLatch(credits);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(credits);
        List<Future<?>> futures = new ArrayList<>();
        try {
            for (int index = 0; index < credits; index++) {
                int reference = index;
                User target = user;
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    accountBalanceService.creditDeposit(
                            target, new BigDecimal("100.00"), "CONCURRENT:" + reference);
                    return null;
                }));
            }
            ready.await();
            start.countDown();
            for (Future<?> future : futures) {
                future.get();
            }
        } finally {
            executor.shutdownNow();
        }

        var balance = balanceRepository.findByAccountKey("USER:" + user.getId() + ":VND").orElseThrow();
        assertEquals(new BigDecimal("1200.00"), balance.getAvailableAmount());
        assertEquals(credits, transactionRepository
                .findByAccountBalanceIdOrderByCreatedAtDesc(balance.getId()).size());
    }
}
