package com.edu.platform.exception;

/**
 * Exception thrown when there are insufficient questions to create an assessment
 */
public class InsufficientQuestionsException extends RuntimeException {
    
    public InsufficientQuestionsException(String message) {
        super(message);
    }
    
    public InsufficientQuestionsException(String message, Throwable cause) {
        super(message, cause);
    }
}