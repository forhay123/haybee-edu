package com.edu.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * ✅ Separate service for isolated deletions
 * This MUST be a separate class so Spring can create AOP proxy for REQUIRES_NEW
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SafeDeletionService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Execute deletion in SEPARATE transaction (isolated from caller)
     * Spring creates AOP proxy because this is called from another service
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int deleteInNewTransaction(String tableName, String columnName, Long id) {
        return deleteInNewTransaction(tableName, columnName, id, "academic");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int deleteInNewTransaction(String tableName, String columnName, Long id, String schema) {
        try {
            // Check if column exists
            String checkSql = """
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_schema = ? 
                  AND table_name = ? 
                  AND column_name = ?
                """;
            
            Integer columnExists = jdbcTemplate.queryForObject(checkSql, Integer.class, schema, tableName, columnName);
            
            if (columnExists == null || columnExists == 0) {
                log.debug("  ⚠️ Column {}.{}.{} does not exist - skipping", schema, tableName, columnName);
                return 0;
            }
            
            // Delete
            String sql = String.format("DELETE FROM %s.%s WHERE %s = ?", schema, tableName, columnName);
            int deleted = jdbcTemplate.update(sql, id);
            
            if (deleted > 0) {
                log.info("  ✅ Deleted {} records from {}.{}", deleted, schema, tableName);
            }
            
            return deleted;
            
        } catch (Exception e) {
            log.warn("  ⚠️ Could not delete from {}.{}: {}", schema, tableName, e.getMessage());
            // Transaction rollback - but caller's transaction continues
            return 0;
        }
    }
}