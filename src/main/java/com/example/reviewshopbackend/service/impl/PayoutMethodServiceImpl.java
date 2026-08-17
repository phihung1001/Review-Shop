package com.example.reviewshopbackend.service.impl;

import java.util.*;
import com.example.reviewshopbackend.dto.request.CreatePayoutMethodRequest;
import com.example.reviewshopbackend.dto.response.PayoutMethodResponse;
import com.example.reviewshopbackend.entity.*;
import com.example.reviewshopbackend.exception.WithdrawalNotFoundException;
import com.example.reviewshopbackend.repository.*;
import com.example.reviewshopbackend.security.PayoutDataCipher;
import com.example.reviewshopbackend.service.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayoutMethodServiceImpl implements PayoutMethodService {
    private final PayoutMethodRepository repository; private final UserRepository users;
    private final PayoutDataCipher cipher; private final PayoutMethodImageStorageService images;
    public PayoutMethodServiceImpl(PayoutMethodRepository repository, UserRepository users,
            PayoutDataCipher cipher, PayoutMethodImageStorageService images) {
        this.repository = repository; this.users = users; this.cipher = cipher; this.images = images;
    }
    @Transactional
    public PayoutMethodResponse create(CreatePayoutMethodRequest request, String email) {
        User user = requireFreelancer(email);
        String number = request.accountNumber().trim();
        List<PayoutMethod> active = repository.findByFreelancerAndStatusOrderByCreatedAtDesc(user, PayoutMethodStatus.ACTIVE);
        boolean makeDefault = request.isDefault() || active.isEmpty();
        if (makeDefault) active.stream().filter(PayoutMethod::isDefaultMethod).forEach(method -> method.setDefaultMethod(false));
        PayoutMethod method = new PayoutMethod(); method.setFreelancer(user); method.setType(request.type());
        method.setBankCode(request.bankCode().trim().toUpperCase(Locale.ROOT)); method.setBankName(request.bankName().trim());
        method.setAccountNumberEncrypted(cipher.encrypt(number)); method.setAccountNumberLast4(number.substring(number.length() - 4));
        method.setAccountHolderName(request.accountHolderName().trim().toUpperCase(Locale.ROOT));
        if (request.qrImageObjectKey() != null && !request.qrImageObjectKey().isBlank())
            method.setQrImageObjectKey(images.requireOwnedObjectKey(request.qrImageObjectKey(), user.getId()));
        method.setStatus(PayoutMethodStatus.ACTIVE); method.setDefaultMethod(makeDefault);
        return response(repository.saveAndFlush(method));
    }
    @Transactional(readOnly = true)
    public List<PayoutMethodResponse> findAll(String email) {
        return repository.findByFreelancerAndStatusOrderByCreatedAtDesc(requireFreelancer(email), PayoutMethodStatus.ACTIVE)
                .stream().map(this::response).toList();
    }
    @Transactional
    public void deactivate(Long id, String email) {
        User user = requireFreelancer(email);
        PayoutMethod method = repository.findByIdAndFreelancer(id, user).orElseThrow(() -> new WithdrawalNotFoundException("Payout method not found"));
        method.setStatus(PayoutMethodStatus.INACTIVE); method.setDefaultMethod(false);
    }
    private PayoutMethodResponse response(PayoutMethod method) {
        return new PayoutMethodResponse(method.getId(), method.getType(), method.getBankCode(), method.getBankName(),
                "******" + method.getAccountNumberLast4(), method.getAccountHolderName(), images.createDownloadUrl(method.getQrImageObjectKey()),
                method.isDefaultMethod(), method.getStatus(), method.getCreatedAt());
    }
    private User requireFreelancer(String email) {
        return users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(u -> u.getRole() == UserRole.FREELANCER)
                .orElseThrow(() -> new AccessDeniedException("Freelancer not found"));
    }
}
