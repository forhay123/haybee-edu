"""
MinIO Object Storage Client
Handles file upload/download for videos, thumbnails, and recordings
"""
import os
from datetime import timedelta
from typing import Optional
from minio import Minio
from minio.error import S3Error
from app.core.logger import get_logger

logger = get_logger(__name__)


class StorageClient:
    """MinIO storage client for managing video files"""
    
    def __init__(self):
        """Initialize MinIO client from environment variables"""
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'minio:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
        self.secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
        
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        
        logger.info(f"MinIO client initialized: {self.endpoint}")
        self._ensure_buckets()
    
    def _ensure_buckets(self):
        """Create buckets if they don't exist"""
        buckets = ['edu-videos', 'edu-recordings', 'edu-thumbnails', 'temp-recordings']
        
        for bucket in buckets:
            try:
                if not self.client.bucket_exists(bucket):
                    self.client.make_bucket(bucket)
                    logger.info(f"Created bucket: {bucket}")
            except S3Error as e:
                logger.error(f"Error creating bucket {bucket}: {e}")
    
    def upload_file(
        self,
        bucket_name: str,
        object_name: str,
        file_path: str,
        content_type: str = 'application/octet-stream'
    ) -> Optional[str]:
        """Upload file to MinIO"""
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
            
            self.client.fput_object(
                bucket_name,
                object_name,
                file_path,
                content_type=content_type
            )
            
            url = f"http://{self.endpoint}/{bucket_name}/{object_name}"
            logger.info(f"Uploaded file to MinIO: {url}")
            return url
            
        except S3Error as e:
            logger.error(f"MinIO upload error: {e}")
            return None
    
    def download_file(
        self,
        bucket_name: str,
        object_name: str,
        destination_path: str
    ) -> Optional[str]:
        """Download file from MinIO"""
        try:
            self.client.fget_object(
                bucket_name,
                object_name,
                destination_path
            )
            logger.info(f"Downloaded file from MinIO: {destination_path}")
            return destination_path
            
        except S3Error as e:
            logger.error(f"MinIO download error: {e}")
            return None
    
    def delete_file(self, bucket_name: str, object_name: str) -> bool:
        """Delete file from MinIO"""
        try:
            self.client.remove_object(bucket_name, object_name)
            logger.info(f"Deleted file from MinIO: {bucket_name}/{object_name}")
            return True
        except S3Error as e:
            logger.error(f"MinIO delete error: {e}")
            return False


# Global storage client instance
storage_client = StorageClient()