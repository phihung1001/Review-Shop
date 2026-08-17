package com.example.reviewshopbackend.repository;

import java.util.Optional;

import com.example.reviewshopbackend.entity.AccountBalance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountBalanceRepository extends JpaRepository<AccountBalance, Long> {
    Optional<AccountBalance> findByAccountKey(String accountKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select balance from AccountBalance balance where balance.accountKey = :accountKey")
    Optional<AccountBalance> findByAccountKeyForUpdate(@Param("accountKey") String accountKey);
}
