package com.example.reviewshopbackend.service;

import com.example.reviewshopbackend.dto.request.*;
import com.example.reviewshopbackend.dto.response.*;
import com.example.reviewshopbackend.entity.WithdrawalStatus;

public interface WithdrawalService {
    WithdrawalResponse create(CreateWithdrawalRequest request, String idempotencyKey, String email);
    PageResponse<WithdrawalResponse> findMine(String email, WithdrawalStatus status, int page, int size);
    WithdrawalResponse findMineById(Long id, String email);
    WithdrawalResponse cancel(Long id, String email);
    PageResponse<WithdrawalResponse> findAdmin(WithdrawalStatus status, int page, int size);
    WithdrawalResponse findAdminById(Long id);
    WithdrawalResponse approve(Long id, WithdrawalAdminActionRequest request, String adminEmail);
    WithdrawalResponse reject(Long id, WithdrawalAdminActionRequest request, String adminEmail);
    WithdrawalResponse complete(Long id, WithdrawalAdminActionRequest request, String adminEmail);
    WithdrawalResponse fail(Long id, WithdrawalAdminActionRequest request, String adminEmail);
}
