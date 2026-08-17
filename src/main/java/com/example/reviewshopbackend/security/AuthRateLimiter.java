//package com.example.reviewshopbackend.security;
//
//import java.time.Duration;
//import java.time.Instant;
//import java.util.concurrent.ConcurrentHashMap;
//
//import com.example.reviewshopbackend.exception.TooManyRequestsException;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Component;
//
//@Component
//public class AuthRateLimiter {
//    private static final int MAX_TRACKED_KEYS = 100_000;
//    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
//    private final boolean enabled;
//
//    public AuthRateLimiter(@Value("${app.auth.rate-limit-enabled:true}") boolean enabled) {
//        this.enabled = enabled;
//    }
//
//    public void check(String operation, String discriminator, int limit, Duration duration) {
//        if (!enabled) {
//            return;
//        }
//        Instant now = Instant.now();
//        if (windows.size() > MAX_TRACKED_KEYS) {
//            windows.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
//            if (windows.size() > MAX_TRACKED_KEYS) {
//                throw new TooManyRequestsException();
//            }
//        }
//
//        String key = operation + ':' + discriminator;
//        Window updated = windows.compute(key, (ignored, current) -> {
//            if (current == null || !current.expiresAt().isAfter(now)) {
//                return new Window(1, now.plus(duration));
//            }
//            return new Window(current.count() + 1, current.expiresAt());
//        });
//        if (updated.count() > limit) {
//            throw new TooManyRequestsException();
//        }
//    }
//
//    private record Window(int count, Instant expiresAt) {
//    }
//}
