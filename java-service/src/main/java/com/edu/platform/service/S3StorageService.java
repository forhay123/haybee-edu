package com.edu.platform.service;

// ✅ AWS SDK v1 Imports
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.*;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Service
@Slf4j
public class S3StorageService {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.access-key-id}")
    private String accessKeyId;

    @Value("${aws.secret-access-key}")
    private String secretAccessKey;

    private AmazonS3 s3Client;

    @PostConstruct
    public void initializeS3() {
        BasicAWSCredentials awsCreds = new BasicAWSCredentials(accessKeyId, secretAccessKey);
        s3Client = AmazonS3ClientBuilder.standard()
                .withRegion(region)
                .withCredentials(new AWSStaticCredentialsProvider(awsCreds))
                .build();
        
        log.info("✅ S3 Client initialized for bucket: {}", bucketName);
    }

    /**
     * Upload a file to S3 and return the public URL
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Generate unique filename
        String originalFileName = file.getOriginalFilename();
        String sanitizedFileName = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String uniqueFileName = System.currentTimeMillis() + "_" + sanitizedFileName;
        String s3Key = folder + "/" + uniqueFileName;

        log.info("📤 Uploading file to S3: {}", s3Key);

        try (InputStream inputStream = file.getInputStream()) {
            // Set metadata
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(file.getContentType());
            
            // Upload to S3
            PutObjectRequest putRequest = new PutObjectRequest(bucketName, s3Key, inputStream, metadata)
                    .withCannedAcl(CannedAccessControlList.PublicRead); // Make publicly readable
            
            s3Client.putObject(putRequest);
            
            // Get the public URL
            String fileUrl = s3Client.getUrl(bucketName, s3Key).toString();
            
            log.info("✅ File uploaded successfully: {}", fileUrl);
            return fileUrl;
            
        } catch (Exception e) {
            log.error("❌ Failed to upload file to S3: {}", e.getMessage(), e);
            throw new IOException("Failed to upload file to S3", e);
        }
    }

    /**
     * Delete a file from S3
     */
    public void deleteFile(String fileUrl) {
        try {
            // Extract S3 key from URL
            String s3Key = extractS3KeyFromUrl(fileUrl);
            
            log.info("🗑️ Deleting file from S3: {}", s3Key);
            s3Client.deleteObject(bucketName, s3Key);
            log.info("✅ File deleted successfully: {}", s3Key);
            
        } catch (Exception e) {
            log.error("❌ Failed to delete file from S3: {}", e.getMessage(), e);
        }
    }

    /**
     * Check if file exists in S3
     */
    public boolean fileExists(String fileUrl) {
        try {
            String s3Key = extractS3KeyFromUrl(fileUrl);
            return s3Client.doesObjectExist(bucketName, s3Key);
        } catch (Exception e) {
            log.error("❌ Error checking file existence: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Get file as InputStream (for serving files)
     */
    public InputStream getFileStream(String fileUrl) throws IOException {
        try {
            String s3Key = extractS3KeyFromUrl(fileUrl);
            S3Object s3Object = s3Client.getObject(bucketName, s3Key);
            return s3Object.getObjectContent();
        } catch (Exception e) {
            log.error("❌ Failed to get file stream: {}", e.getMessage());
            throw new IOException("Failed to retrieve file from S3", e);
        }
    }

    /**
     * Extract S3 key from full URL
     * Example: https://bucket.s3.region.amazonaws.com/lessons/file.pdf -> lessons/file.pdf
     */
    private String extractS3KeyFromUrl(String fileUrl) {
        if (fileUrl.contains(bucketName)) {
            // Extract everything after the bucket name
            int bucketIndex = fileUrl.indexOf(bucketName) + bucketName.length() + 1;
            return fileUrl.substring(bucketIndex);
        }
        
        // If URL format is different, try to extract from path
        String[] parts = fileUrl.split("/");
        if (parts.length >= 2) {
            return parts[parts.length - 2] + "/" + parts[parts.length - 1];
        }
        
        throw new IllegalArgumentException("Invalid S3 URL format: " + fileUrl);
    }
}