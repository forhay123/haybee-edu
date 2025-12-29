/**package com.edu.platform.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;


 * ✅ Cache Configuration for Educational Platform
 * Configures multiple cache managers for different use cases

@Configuration
@EnableCaching
public class CacheConfig {


    @Bean
    @Primary  // ✅ Mark this as the primary/default CacheManager
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
            "students",
            "subjects",
            "lessons",
            "assessments"
        );
    }


    @Bean(name = "cache30m")
    public CacheManager cache30mManager() {
        return new ConcurrentMapCacheManager(
            "comprehensiveLessons",
            "dailyPlans",
            "progressReports"
        );
    }
}

*/