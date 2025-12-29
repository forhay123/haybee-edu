package com.edu.platform.exception;

public class YouTubeApiException extends RuntimeException {
    private Integer statusCode;

    public YouTubeApiException(String message) {
        super(message);
    }

    public YouTubeApiException(String message, int statusCode) {
        super(message + " (HTTP " + statusCode + ")");
        this.statusCode = statusCode;
    }

    public YouTubeApiException(String message, Throwable cause) {
        super(message, cause);
    }

    public Integer getStatusCode() {
        return statusCode;
    }
}