package com.example.reviewshopbackend.repository;

import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobStatus;
import com.example.reviewshopbackend.entity.User;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByStatusAndAvailableSlotsGreaterThanOrderByCreatedAtDesc(JobStatus status, int availableSlots);

    List<Job> findByClientOrderByCreatedAtDesc(User client);

    Optional<Job> findByIdAndClient(Long id, User client);

    Optional<Job> findByClientAndIdempotencyKey(User client, String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from Job job where job.id = :id")
    Optional<Job> findByIdForUpdate(@Param("id") Long id);
}
