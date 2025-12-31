package com.edu.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter — validates and loads user context from tokens.
 */
@RequiredArgsConstructor
public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtRequestFilter.class);

    private final JwtTokenUtil jwtTokenUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String remoteAddr = request.getRemoteAddr();

        // 🔍 DEBUG: Log every incoming request
        log.info("🔍 Request: {} {} (from: {})", method, path, remoteAddr);

        // ✅ Bypass JWT for Python AI endpoints
        // Pattern 1: /api/v1/lesson-topics/{id}/ai-status
        // Pattern 2: /api/v1/integration/assessments/create/{id}
        if ("POST".equals(method) && 
            (path.matches(".*/lesson-topics/\\d+/ai-status") || 
             path.matches(".*/integration/assessments/create/\\d+"))) {
            log.info("✅ BYPASSING JWT auth for Python AI endpoint: {} {}", method, path);
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = (StringUtils.hasText(header) && header.startsWith("Bearer "))
                ? header.substring(7)
                : null;

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                if (jwtTokenUtil.validateToken(token)) {
                    String email = jwtTokenUtil.parseClaims(token).get("email", String.class);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    var authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("✅ JWT authenticated: {}", email);
                }
            } catch (Exception ex) {
                log.warn("⚠️ JWT authentication failed for {} {}: {}", method, path, ex.getMessage());
            }
        }

        chain.doFilter(request, response);
    }
}