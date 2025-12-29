package com.edu.platform.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test/simple")
public class SimpleTestController {

    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }
}
