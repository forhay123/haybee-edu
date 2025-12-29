package com.edu.platform.config;

import jakarta.annotation.PostConstruct;   // ✅ FIXED
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class for Supabase integration
 * Loads Supabase credentials from environment variables
 */
@Configuration
@Getter
@Slf4j
public class SupabaseConfig {

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.anon-key:}")
    private String supabaseAnonKey;

    @Value("${supabase.service-role-key:}")
    private String supabaseServiceRoleKey;

    /**
     * Validates configuration on startup
     * Logs masked values for verification without exposing secrets
     */
    @PostConstruct
    public void init() {
        log.info("🔧 Initializing Supabase Configuration...");

        if (supabaseUrl == null || supabaseUrl.isEmpty()) {
            log.error("❌ SUPABASE_URL is not configured!");
            throw new IllegalStateException("Missing SUPABASE_URL environment variable");
        }

        if (supabaseAnonKey == null || supabaseAnonKey.isEmpty()) {
            log.error("❌ SUPABASE_ANON_KEY is not configured!");
            throw new IllegalStateException("Missing SUPABASE_ANON_KEY environment variable");
        }

        if (supabaseServiceRoleKey == null || supabaseServiceRoleKey.isEmpty()) {
            log.error("❌ SUPABASE_SERVICE_ROLE_KEY is not configured!");
            throw new IllegalStateException("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
        }

        log.info("✅ Supabase URL: {}", supabaseUrl);
        log.info("✅ Supabase Anon Key: {}...{}",
                maskKey(supabaseAnonKey, 10),
                maskKey(supabaseAnonKey, -10));
        log.info("✅ Supabase Service Role Key: {}...{}",
                maskKey(supabaseServiceRoleKey, 10),
                maskKey(supabaseServiceRoleKey, -10));

        log.info("🎉 Supabase configuration loaded successfully!");
    }

    private String maskKey(String key, int length) {
        if (key == null || key.isEmpty()) {
            return "***";
        }

        if (length > 0) {
            return key.length() >= length ? key.substring(0, length) : key;
        } else {
            int absLength = Math.abs(length);
            return key.length() >= absLength ?
                    key.substring(key.length() - absLength) : key;
        }
    }

    public String getRestApiUrl() {
        return supabaseUrl + "/rest/v1";
    }

    public String getRealtimeUrl() {
        return supabaseUrl + "/realtime/v1";
    }

    public String getStorageUrl() {
        return supabaseUrl + "/storage/v1";
    }
}
