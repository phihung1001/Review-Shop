package com.example.reviewshopbackend.service;

import java.util.List;

import com.example.reviewshopbackend.dto.request.RequiredLevelRequest;
import com.example.reviewshopbackend.dto.response.RequiredLevelResponse;

/**
 * Provides CRUD operations for account-level pricing rules used by review jobs.
 */
public interface RequiredLevelService {
    /** @return all pricing levels ordered by identifier */
    List<RequiredLevelResponse> findAll();

    /**
     * @param id pricing-level identifier
     * @return matching pricing level
     */
    RequiredLevelResponse findById(Long id);

    /**
     * @param request validated account level, description, and per-review price
     * @return created pricing level
     */
    RequiredLevelResponse create(RequiredLevelRequest request);

    /**
     * @param id pricing-level identifier
     * @param request replacement values
     * @return updated pricing level
     */
    RequiredLevelResponse update(Long id, RequiredLevelRequest request);

    /**
     * @param id pricing-level identifier to delete
     */
    void delete(Long id);
}
