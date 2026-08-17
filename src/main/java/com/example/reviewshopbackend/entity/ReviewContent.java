package com.example.reviewshopbackend.entity;

import java.util.List;

public record ReviewContent(
        String content,
        List<String> images
) {
    public ReviewContent {
        content = content == null ? "" : content;
        images = images == null ? List.of() : List.copyOf(images);
    }
}
