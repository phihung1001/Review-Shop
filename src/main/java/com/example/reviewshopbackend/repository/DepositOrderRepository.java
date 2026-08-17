package com.example.reviewshopbackend.repository;

import java.util.Optional;

import com.example.reviewshopbackend.entity.DepositOrder;
import com.example.reviewshopbackend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DepositOrderRepository extends JpaRepository<DepositOrder, Long> {
    Optional<DepositOrder> findByClientAndIdempotencyKey(User client, String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select deposit from DepositOrder deposit where deposit.id = :id")
    Optional<DepositOrder> findByIdForUpdate(@Param("id") Long id);
}
