package com.edu.platform.config;

import jakarta.annotation.PostConstruct;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class ZoomConfig {

    private static final Logger log = LoggerFactory.getLogger(ZoomConfig.class);

    @Value("${zoom.account-id}")
    private String accountId;

    @Value("${zoom.client-id}")
    private String clientId;

    @Value("${zoom.client-secret}")
    private String clientSecret;

    @Value("${zoom.api-base-url}")
    private String apiBaseUrl;

    @Value("${zoom.oauth-token-url}")
    private String oauthTokenUrl;

    @Bean(name = "zoomHttpClient")
    public OkHttpClient zoomHttpClient() {
        return new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .connectionPool(new ConnectionPool(5, 5, TimeUnit.MINUTES))
                .retryOnConnectionFailure(true)
                .build();
    }

    public String getAccountId() {
        return accountId;
    }

    public String getClientId() {
        return clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public String getOauthTokenUrl() {
        return oauthTokenUrl;
    }

    @PostConstruct
    public void logConfig() {
        log.info("🔧 Zoom Configuration Loaded:");
        log.info("  Account ID: {}", accountId != null ? accountId.substring(0, 5) + "..." : "NOT SET");
        log.info("  Client ID: {}", clientId != null ? clientId.substring(0, 5) + "..." : "NOT SET");
        log.info("  API Base URL: {}", apiBaseUrl);
    }
}
