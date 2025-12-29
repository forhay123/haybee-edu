
package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;



/**
 * Result of bulk operations (delete, reprocess, etc.)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkOperationResultDto {
    private Integer successCount;
    private Integer failedCount;
    private List<Long> failedIds;
    private String message;
}