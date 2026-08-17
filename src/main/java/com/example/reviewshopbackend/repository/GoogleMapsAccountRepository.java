package com.example.reviewshopbackend.repository;

import java.util.List;
import java.util.Optional;

import com.example.reviewshopbackend.entity.GoogleMapsAccount;
import com.example.reviewshopbackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoogleMapsAccountRepository extends JpaRepository<GoogleMapsAccount, Long> {
    boolean existsByContributorId(String contributorId);
    Optional<GoogleMapsAccount> findByIdAndFreelancer(Long id, User freelancer);
    List<GoogleMapsAccount> findByFreelancerAndActiveTrueOrderByCreatedAtDesc(User freelancer);
}
