package com.example.reviewshopbackend.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.example.reviewshopbackend.entity.AssignmentStatus;
import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobAssignment;
import com.example.reviewshopbackend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobAssignmentRepository extends JpaRepository<JobAssignment, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select assignment from JobAssignment assignment where assignment.id = :id")
    Optional<JobAssignment> findByIdForUpdate(@Param("id") Long id);

    List<JobAssignment> findByFreelancerOrderByCreatedAtDesc(User freelancer);

    boolean existsByJobAndFreelancerAndStatusIn(
            Job job,
            User freelancer,
            Collection<AssignmentStatus> statuses
    );

    boolean existsByJobAndReviewContentIndexAndStatusIn(
            Job job,
            Integer reviewContentIndex,
            Collection<AssignmentStatus> statuses
    );

    List<JobAssignment> findByJobInAndStatusIn(
            Collection<Job> jobs,
            Collection<AssignmentStatus> statuses
    );

    List<JobAssignment> findByStatusAndExpiresAtLessThanEqualOrderById(
            AssignmentStatus status,
            Instant now
    );

    List<JobAssignment> findByJobAndStatusAndExpiresAtLessThanEqual(
            Job job,
            AssignmentStatus status,
            Instant now
    );
}
