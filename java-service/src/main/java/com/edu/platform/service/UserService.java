package com.edu.platform.service;

import com.edu.platform.dto.user.UserDto;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.model.User;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;


@Slf4j 
/**
 * Provides user-related CRUD, lookup, and mapping logic.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<UserDto> getAllUserDtos() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
    
    
    public StudentType getStudentTypeByEmail(String email) {
        return findByEmail(email)
            .map(User::getStudentType)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }


    public UserDto toDto(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet());

        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .enabled(user.isEnabled())
                .roles(roles)
                .build();
    }
    
    /**
     * Delete a user by ID
     */
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        
        userRepository.delete(user);
        log.info("✅ User {} deleted", id);
    }
}
