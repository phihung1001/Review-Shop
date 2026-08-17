package com.example.reviewshopbackend.repository;

import java.util.List;
import java.util.Optional;

import com.example.reviewshopbackend.entity.AccountTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTransactionRepository extends JpaRepository<AccountTransaction, Long> {
    Optional<AccountTransaction> findByIdempotencyKey(String idempotencyKey);
    List<AccountTransaction> findByAccountBalanceIdOrderByCreatedAtDesc(Long accountBalanceId);
}
