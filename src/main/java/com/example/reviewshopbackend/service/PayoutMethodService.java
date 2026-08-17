package com.example.reviewshopbackend.service;

import java.util.List;
import com.example.reviewshopbackend.dto.request.CreatePayoutMethodRequest;
import com.example.reviewshopbackend.dto.response.PayoutMethodResponse;

public interface PayoutMethodService {
    PayoutMethodResponse create(CreatePayoutMethodRequest request, String email);
    List<PayoutMethodResponse> findAll(String email);
    void deactivate(Long id, String email);
}
