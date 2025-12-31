"""
Redis Client for caching and pub/sub
"""
import os
import json
from typing import Optional, Any
import redis
from app.core.logger import get_logger

logger = get_logger(__name__)


class RedisClient:
    """Redis client for caching and real-time updates"""
    
    def __init__(self):
        """Initialize Redis client from environment variables"""
        self.host = os.getenv('REDIS_HOST', 'redis')
        self.port = int(os.getenv('REDIS_PORT', 6379))
        self.password = os.getenv('REDIS_PASSWORD')  # ✅ ADD THIS
        self.db = 2  # Separate DB from Celery (0=broker, 1=results, 2=cache)
        
        # ✅ FIX: Add password to connection pool
        pool_kwargs = {
            'host': self.host,
            'port': self.port,
            'db': self.db,
            'decode_responses': True,
            'max_connections': 10
        }
        
        if self.password:
            pool_kwargs['password'] = self.password
        
        self.pool = redis.ConnectionPool(**pool_kwargs)
        self.client = redis.Redis(connection_pool=self.pool)
        
        try:
            self.client.ping()
            logger.info(f"Redis connected: {self.host}:{self.port} (DB {self.db})")
        except redis.ConnectionError as e:
            logger.error(f"Redis connection failed: {e}")
    
    def set_with_ttl(self, key: str, value: Any, ttl_seconds: int) -> bool:
        """Set key with expiration"""
        try:
            serialized = json.dumps(value) if not isinstance(value, str) else value
            self.client.setex(key, ttl_seconds, serialized)
            logger.debug(f"Set key with TTL: {key} ({ttl_seconds}s)")
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value by key"""
        try:
            value = self.client.get(key)
            if value is None:
                return None
            
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
                
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete key"""
        try:
            result = self.client.delete(key)
            logger.debug(f"Deleted key: {key}")
            return result > 0
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            return self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()