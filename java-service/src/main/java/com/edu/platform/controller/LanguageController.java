package com.edu.platform.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class LanguageController {

    @GetMapping("/languages")
    public List<Map<String, Object>> getLanguages() {
        // Hardcoded for now; can move to DB later
        return List.of(
                Map.of("id", 1, "name", "English"),
                Map.of("id", 2, "name", "French"),
                Map.of("id", 3, "name", "Spanish")
        );
    }
}
