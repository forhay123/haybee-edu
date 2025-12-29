package com.edu.platform.exception;

/**
 * Thrown when a requested resource (e.g., User, Role) is not found in the database.
 * Mapped globally via {@link GlobalExceptionHandler}.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(Class<?> entityClass, Object identifier) {
        super(String.format("%s not found with identifier: %s", entityClass.getSimpleName(), identifier));
    }
}
