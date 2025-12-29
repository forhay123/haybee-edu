/**package com.edu.platform.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;


 * Configuration for Supabase datasource (for chat entities only)

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    basePackages = "com.edu.platform.repository.chat", // Chat repositories only
    entityManagerFactoryRef = "supabaseEntityManagerFactory",
    transactionManagerRef = "supabaseTransactionManager"
)
public class SupabaseDataSourceConfig {

    @Value("${supabase.database.url}")
    private String url;

    @Value("${supabase.database.username}")
    private String username;

    @Value("${supabase.database.password}")
    private String password;

    @Bean(name = "supabaseDataSource")
    public DataSource supabaseDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        
        // Supabase-specific settings
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        
        // SSL settings for Supabase
        config.addDataSourceProperty("ssl", "true");
        config.addDataSourceProperty("sslmode", "require");
        
        return new HikariDataSource(config);
    }

    @Bean(name = "supabaseEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean supabaseEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("supabaseDataSource") DataSource dataSource) {
        
        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        properties.put("hibernate.hbm2ddl.auto", "validate"); // ✅ CHANGED: Don't try to create tables
        properties.put("hibernate.default_schema", "chat");
        properties.put("hibernate.show_sql", false);
        
        return builder
                .dataSource(dataSource)
                .packages("com.edu.platform.model.chat") // Chat entities only
                .persistenceUnit("supabase")
                .properties(properties)
                .build();
    }

    @Bean(name = "supabaseTransactionManager")
    public PlatformTransactionManager supabaseTransactionManager(
            @Qualifier("supabaseEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}

 */