package com.edu.platform.model.enums;

public enum VideoStatus {
    PENDING,
    UPLOADING,      // <-- Add this if missing
    PROCESSING,
    PUBLISHED,
    FAILED,
    ARCHIVED,
    DELETED,
    ACTIVE          // Alias for PUBLISHED
}