package com.example.reviewshopbackend.repository;

import java.util.Optional;
import com.example.reviewshopbackend.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {
    Optional<Withdrawal> findByFreelancerAndIdempotencyKey(User freelancer, String idempotencyKey);
    Optional<Withdrawal> findByIdAndFreelancer(Long id, User freelancer);
    boolean existsByFreelancerAndStatusIn(User freelancer, Iterable<WithdrawalStatus> statuses);
    Page<Withdrawal> findByFreelancer(User freelancer, Pageable pageable);
    Page<Withdrawal> findByFreelancerAndStatus(User freelancer, WithdrawalStatus status, Pageable pageable);
    Page<Withdrawal> findByStatus(WithdrawalStatus status, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select withdrawal from Withdrawal withdrawal where withdrawal.id = :id")
    Optional<Withdrawal> findByIdForUpdate(@Param("id") Long id);
}
