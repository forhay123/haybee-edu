package com.edu.platform.service;

import com.edu.platform.dto.auth.*;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.Role;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.RoleRepository;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.security.JwtTokenUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Handles all authentication-related logic:
 * login, register, refresh token.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;

    /**
     * Authenticate user and return JWT tokens.
     */
    public JwtResponse login(LoginRequest req) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );

        var user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Set<String> roles = user.getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String access = jwtTokenUtil.generateAccessToken(user.getId(), user.getEmail(), roles);
        String refresh = jwtTokenUtil.generateRefreshToken(user.getId());

        return new JwtResponse(
                access,
                refresh,
                jwtTokenUtil.parseClaims(access).getExpiration().getTime(),
                user.getId(),
                user.getEmail(),
                roles
        );
    }

    /**
     * Register new user with default role STUDENT.
     */
    @Transactional
    public JwtResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }

        if (req.getPhone() == null || req.getPhone().isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }

        String userType = req.getUserType().toUpperCase();
        StudentType studentType = req.getStudentType();

        if ("STUDENT".equals(userType)) {
            if (studentType == null) {
                throw new IllegalArgumentException("Student type must be selected for STUDENT user");
            }
        } else {
            studentType = null; // clear studentType if not student
        }

        User user = User.builder()
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .userType(userType)
                .studentType(studentType)
                .enabled(true)
                .build();

        Role role = roleRepository.findByName(userType)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                            .name(userType)
                            .description("Role for " + userType)
                            .build()
                ));

        user.getRoles().add(role);
        user = userRepository.save(user);

        Set<String> roles = user.getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String access = jwtTokenUtil.generateAccessToken(user.getId(), user.getEmail(), roles);
        String refresh = jwtTokenUtil.generateRefreshToken(user.getId());

        return new JwtResponse(
                access,
                refresh,
                jwtTokenUtil.parseClaims(access).getExpiration().getTime(),
                user.getId(),
                user.getEmail(),
                roles
        );
    }


    /**
     * Refresh access token using refresh token.
     */
    public JwtResponse refreshToken(RefreshTokenRequest req) {
        if (!jwtTokenUtil.validateToken(req.getRefreshToken())) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        Long userId = jwtTokenUtil.getUserIdFromToken(req.getRefreshToken());
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Set<String> roles = user.getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String access = jwtTokenUtil.generateAccessToken(user.getId(), user.getEmail(), roles);
        String refresh = jwtTokenUtil.generateRefreshToken(user.getId());

        return new JwtResponse(
                access,
                refresh,
                jwtTokenUtil.parseClaims(access).getExpiration().getTime(),
                user.getId(),
                user.getEmail(),
                roles
        );
    }
}
