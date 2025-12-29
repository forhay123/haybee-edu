package com.edu.platform.dto.user;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleAssignRequest {
    private Long userId;
    private String role;
}
