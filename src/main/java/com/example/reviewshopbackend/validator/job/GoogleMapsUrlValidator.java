package com.example.reviewshopbackend.validator.job;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validator chỉ chấp nhận HTTPS URL thuộc các hostname Google Maps chính thức.
 */
public class GoogleMapsUrlValidator implements ConstraintValidator<GoogleMapsUrl, String> {
    private static final Set<String> GOOGLE_DOMAINS = Set.of("google.com", "google.com.vn");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }

        try {
            URI uri = new URI(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                return false;
            }

            String host = uri.getHost().toLowerCase(Locale.ROOT);
            String path = uri.getPath() == null ? "" : uri.getPath().toLowerCase(Locale.ROOT);

            if ("maps.app.goo.gl".equals(host)) {
                return !path.isBlank() && !"/".equals(path);
            }
            if ("goo.gl".equals(host)) {
                return path.equals("/maps") || path.startsWith("/maps/");
            }
            if (!isGoogleDomain(host)) {
                return false;
            }

            return host.startsWith("maps.google.")
                    || path.equals("/maps")
                    || path.startsWith("/maps/");
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static boolean isGoogleDomain(String host) {
        String normalizedHost = host.startsWith("www.") ? host.substring(4) : host;
        if (normalizedHost.startsWith("maps.")) {
            normalizedHost = normalizedHost.substring(5);
        }
        return GOOGLE_DOMAINS.contains(normalizedHost);
    }
}
