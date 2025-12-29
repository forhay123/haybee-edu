package com.edu.platform.config;

import com.edu.platform.security.CustomUserDetailsService;
import com.edu.platform.security.JwtRequestFilter;
import com.edu.platform.security.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {
    
    private final CustomUserDetailsService userDetailsService;
    private final JwtTokenUtil jwtTokenUtil;

    @Bean
    public JwtRequestFilter jwtRequestFilter() {
        return new JwtRequestFilter(jwtTokenUtil, userDetailsService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ✅ Enable CORS with explicit configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // ✅ Disable CSRF (not needed for JWT)
            .csrf(csrf -> csrf.disable())
            
            // ✅ Stateless JWT session management
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // ✅ Authorization rules
            .authorizeHttpRequests(auth -> auth
                // ✅ Public OAuth endpoints - NO AUTHENTICATION REQUIRED
                // These endpoints handle OAuth flow where JWT tokens aren't available
                .requestMatchers(
                    "/oauth/**"  // Allows ALL OAuth endpoints without auth
                ).permitAll()
                
                // ✅ MOVE PDF uploads FIRST and be VERY specific
                .requestMatchers("/lesson-topics/uploads/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                
                
                // Other public endpoints
                .requestMatchers(
                    "/auth/**",
                    "/actuator/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/internal/generate-system-token",
                    "/swagger-ui.html",
                    "/ws-chat/**",
                    "/test/zoom/health"
                ).permitAll()
                
                // ✅ Allow Python service to report AI status
                .requestMatchers(HttpMethod.POST, "/lesson-topics/*/ai-status").permitAll()
                .requestMatchers("/individual/callback/**").permitAll()
                
                // All others require authentication
                .anyRequest().authenticated()
            )
            
            // ✅ Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtRequestFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    /**
     * ✅ Explicit CORS configuration for WebSocket + REST API
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // ✅ Allow specific origins (adjust for production)
        configuration.setAllowedOrigins(List.of(
            "http://localhost:5173",
            "http://172.20.10.3:5173",
            "http://192.168.101.20:5173"
        ));
        
        // ✅ Allow all HTTP methods
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // ✅ Allow all headers
        configuration.setAllowedHeaders(List.of("*"));
        
        // ✅ Allow credentials (required for Authorization header)
        configuration.setAllowCredentials(true);
        
        // ✅ Apply to all paths
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}