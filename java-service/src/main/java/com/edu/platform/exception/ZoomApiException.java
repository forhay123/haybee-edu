package com.edu.platform.exception;

public class ZoomApiException extends RuntimeException {
    private final int statusCode;
    private final String errorCode;

    public ZoomApiException(String message) {
        super(message);
        this.statusCode = 0;
        this.errorCode = null;
    }

    public ZoomApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = null;
    }

    public ZoomApiException(String message, int statusCode, String errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public ZoomApiException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
        this.errorCode = null;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}