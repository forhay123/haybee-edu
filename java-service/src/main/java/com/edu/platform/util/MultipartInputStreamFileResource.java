package com.edu.platform.util;

import org.springframework.core.io.InputStreamResource;

import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;

/**
 * Helper class to wrap MultipartFile input stream for RestTemplate upload.
 * This is useful when you need to upload a file via RestTemplate
 * and the file content length is unknown at compile time.
 */
public class MultipartInputStreamFileResource extends InputStreamResource {

    private final String filename;

    /**
     * Constructor.
     *
     * @param inputStream the input stream of the file
     * @param filename    the name of the file
     */
    public MultipartInputStreamFileResource(InputStream inputStream, String filename) {
        super(Objects.requireNonNull(inputStream, "InputStream must not be null"));
        this.filename = Objects.requireNonNull(filename, "Filename must not be null");
    }

    @Override
    public String getFilename() {
        return this.filename;
    }

    /**
     * Returns -1 to indicate unknown content length. This avoids
     * RestTemplate errors when the length is not known in advance.
     */
    @Override
    public long contentLength() throws IOException {
        return -1;
    }

    @Override
    public String toString() {
        return "MultipartInputStreamFileResource{filename='" + filename + "'}";
    }
}
