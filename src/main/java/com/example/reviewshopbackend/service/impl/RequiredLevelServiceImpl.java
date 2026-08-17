package com.example.reviewshopbackend.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.example.reviewshopbackend.dto.request.RequiredLevelRequest;
import com.example.reviewshopbackend.dto.response.RequiredLevelResponse;
import com.example.reviewshopbackend.entity.RequiredLevel;
import com.example.reviewshopbackend.exception.RequiredLevelNotFoundException;
import com.example.reviewshopbackend.repository.RequiredLevelRepository;
import com.example.reviewshopbackend.service.RequiredLevelService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RequiredLevelServiceImpl implements RequiredLevelService {
    private final RequiredLevelRepository repository;

    public RequiredLevelServiceImpl(RequiredLevelRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequiredLevelResponse> findAll() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                .stream()
                .map(RequiredLevelResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RequiredLevelResponse findById(Long id) {
        return RequiredLevelResponse.from(getById(id));
    }

    @Override
    @Transactional
    public RequiredLevelResponse create(RequiredLevelRequest request) {
        RequiredLevel requiredLevel = new RequiredLevel();
        requiredLevel.setDescription(request.description().trim());
        requiredLevel.setPricePerReview(normalizePrice(request.pricePerReview()));
        requiredLevel.setRank(request.rank() == null ? 1 : request.rank());
        return RequiredLevelResponse.from(repository.saveAndFlush(requiredLevel));
    }

    @Override
    @Transactional
    public RequiredLevelResponse update(Long id, RequiredLevelRequest request) {
        RequiredLevel requiredLevel = getById(id);
        requiredLevel.setDescription(request.description().trim());
        requiredLevel.setPricePerReview(normalizePrice(request.pricePerReview()));
        requiredLevel.setRank(request.rank() == null ? requiredLevel.getRank() : request.rank());
        return RequiredLevelResponse.from(repository.saveAndFlush(requiredLevel));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        RequiredLevel requiredLevel = getById(id);
        repository.delete(requiredLevel);
        repository.flush();
    }

    private RequiredLevel getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RequiredLevelNotFoundException(id));
    }

    private static BigDecimal normalizePrice(BigDecimal pricePerReview) {
        return pricePerReview.setScale(2, RoundingMode.UNNECESSARY);
    }
}
