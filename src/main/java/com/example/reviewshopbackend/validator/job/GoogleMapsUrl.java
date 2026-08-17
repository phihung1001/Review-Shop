package com.example.reviewshopbackend.validator.job;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Kiểm tra chuỗi URL có trỏ tới một đường dẫn Google Maps được hỗ trợ hay không.
 */
@Documented
@Constraint(validatedBy = GoogleMapsUrlValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface GoogleMapsUrl {
    String message() default "mapLink must be a valid Google Maps URL";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
