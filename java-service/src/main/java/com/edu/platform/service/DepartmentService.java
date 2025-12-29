package com.edu.platform.service;

import com.edu.platform.dto.classdata.DepartmentDto;
import com.edu.platform.model.Department;
import com.edu.platform.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Business logic for managing academic departments.
 */
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    /** Get all departments */
    public List<DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /** Get department by ID */
    public Optional<DepartmentDto> getDepartment(Long id) {
        return departmentRepository.findById(id).map(this::toDto);
    }

    /** Create a new department */
    public DepartmentDto createDepartment(DepartmentDto dto) {
        if (departmentRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Department with name '" + dto.getName() + "' already exists");
        }
        Department entity = Department.builder()
                .name(dto.getName())
                .code(dto.getCode())
                .description(dto.getDescription())
                .build();
        return toDto(departmentRepository.save(entity));
    }

    /** Update an existing department */
    public DepartmentDto updateDepartment(Long id, DepartmentDto dto) {
        Department updated = departmentRepository.findById(id)
                .map(existing -> {
                    existing.setName(dto.getName());
                    existing.setCode(dto.getCode());
                    existing.setDescription(dto.getDescription());
                    return departmentRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Department not found"));
        return toDto(updated);
    }

    /** Delete a department */
    public void deleteDepartment(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new RuntimeException("Department not found");
        }
        departmentRepository.deleteById(id);
    }

    /** Mapper: Department → DTO */
    private DepartmentDto toDto(Department entity) {
        return DepartmentDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .code(entity.getCode())
                .description(entity.getDescription())
                .build();
    }
}
