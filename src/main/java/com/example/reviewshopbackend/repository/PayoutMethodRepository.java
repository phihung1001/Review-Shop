package com.example.reviewshopbackend.repository;

import java.util.List;
import java.util.Optional;
import com.example.reviewshopbackend.entity.PayoutMethod;
import com.example.reviewshopbackend.entity.PayoutMethodStatus;
import com.example.reviewshopbackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayoutMethodRepository extends JpaRepository<PayoutMethod, Long> {
    List<PayoutMethod> findByFreelancerAndStatusOrderByCreatedAtDesc(User freelancer, PayoutMethodStatus status);
    Optional<PayoutMethod> findByIdAndFreelancer(Long id, User freelancer);
}
