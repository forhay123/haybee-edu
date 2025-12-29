package com.edu.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class EduPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(EduPlatformApplication.class, args);
        System.out.println("🚀 EduPlatformApplication started successfully!");
    }

    /**
     * Global RestTemplate bean for IntegrationService and others.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
