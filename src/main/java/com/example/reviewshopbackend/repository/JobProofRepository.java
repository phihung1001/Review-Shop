package com.example.reviewshopbackend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.example.reviewshopbackend.entity.Job;
import com.example.reviewshopbackend.entity.JobProof;
import com.example.reviewshopbackend.entity.ProofStatus;
import com.example.reviewshopbackend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobProofRepository extends JpaRepository<JobProof, Long> {
    List<JobProof> findByFreelancerOrderByCreatedAtDesc(User freelancer);

    List<JobProof> findByJobClientOrderByCreatedAtDesc(User client);

    List<JobProof> findByJobClientAndStatusInOrderByReviewedAtDescCreatedAtDesc(
            User client,
            Collection<ProofStatus> statuses
    );

    Optional<JobProof> findByIdAndJobClient(Long id, User client);

    Optional<JobProof> findByIdAndJobClientAndStatusIn(
            Long id,
            User client,
            Collection<ProofStatus> statuses
    );

    List<JobProof> findByJobInAndStatusIn(Collection<Job> jobs, Collection<ProofStatus> statuses);

    boolean existsByJobAndFreelancerAndStatusIn(
            Job job,
            User freelancer,
            Collection<ProofStatus> statuses
    );

    boolean existsByJobAndReviewContentIndexAndStatusIn(
            Job job,
            Integer reviewContentIndex,
            Collection<ProofStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select proof from JobProof proof where proof.id = :id")
    Optional<JobProof> findByIdForUpdate(@Param("id") Long id);
}
