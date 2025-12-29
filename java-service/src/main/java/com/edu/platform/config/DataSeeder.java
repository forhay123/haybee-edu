/*package com.edu.platform.config;

import com.edu.platform.model.*;
import com.edu.platform.model.enums.StudentType;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final ClassRepository classRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Override
    public void run(String... args) throws Exception {
        seedRoles();
        seedDepartments();
        seedSubjects();
        seedDefaultUsersAndProfiles();
        System.out.println("✅ DataSeeder completed successfully.");
    }

    @Transactional
    public void seedRoles() {
        List<Role> roles = List.of(
                new Role(null, "ADMIN", "Administrator with full access"),
                new Role(null, "TEACHER", "Teacher role with class access"),
                new Role(null, "STUDENT", "Default role for new users"),
                new Role(null, "PARENT", "Parent role for monitoring student progress")
        );

        for (Role role : roles) {
            roleRepository.findByName(role.getName())
                    .orElseGet(() -> {
                        System.out.println("🌱 Creating role: " + role.getName());
                        return roleRepository.save(role);
                    });
        }
    }

    @Transactional
    public void seedDepartments() throws IOException {
        if (departmentRepository.count() > 0) return;

        var resource = new ClassPathResource("seed/departments.csv");
        List<String> lines = readCsv(resource);

        List<Department> departments = lines.stream()
                .skip(1) // skip header
                .map(line -> line.split(",", -1))
                .filter(cols -> cols.length >= 4 && !cols[2].isBlank())
                .map(cols -> Department.builder()
                        .name(cols[1].trim())
                        .code(cols[2].trim())
                        .description(cols[3].trim())
                        .build())
                .collect(Collectors.toList());

        departmentRepository.saveAll(departments);
        System.out.println("🌱 Seeded " + departments.size() + " departments");
    }

    @Transactional
    public void seedSubjects() throws IOException {
        if (subjectRepository.count() > 0) return;

        var resource = new ClassPathResource("seed/subjects.csv");
        List<String> lines = readCsv(resource);

        List<Subject> subjects = lines.stream()
                .skip(1)
                .map(line -> line.split(",", -1))
                .filter(cols -> cols.length >= 6)
                .map(cols -> {
                    Long deptId = Long.parseLong(cols[4].trim());
                    Department dept = departmentRepository.findById(deptId)
                            .orElseThrow(() -> new RuntimeException("Department not found: " + deptId));
                    return Subject.builder()
                            .name(cols[1].trim())
                            .code(cols[2].trim())
                            .level(cols[3].trim())
                            .department(dept)
                            .compulsory(Boolean.parseBoolean(cols[5].trim()))
                            .build();
                })
                .collect(Collectors.toList());

        subjectRepository.saveAll(subjects);
        System.out.println("🌱 Seeded " + subjects.size() + " subjects");
    }

    @Transactional
    public void seedDefaultUsersAndProfiles() {
        if (userRepository.count() > 0) {
            System.out.println("ℹ️ Users already exist — skipping user seeding");
            return;
        }

        Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();
        Role teacherRole = roleRepository.findByName("TEACHER").orElseThrow();
        Role studentRole = roleRepository.findByName("STUDENT").orElseThrow();

        Department defaultDept = departmentRepository.findAll().stream().findFirst().orElse(null);
        ClassEntity defaultClass = classRepository.findAll().stream().findFirst().orElse(null);

        List<User> users = List.of(
                User.builder()
                        .email("admin@edu.com")
                        .phone("+2348000000001")
                        .password("$2a$12$HPSoylDrYMzt6pr5D.CrNO.qEl60rPXpF4tu7NTtc/YXV766LiK9C")
                        .fullName("Admin User")
                        .userType("ADMIN")
                        .roles(Set.of(adminRole))
                        .enabled(true)
                        .createdAt(Instant.now())
                        .build(),

                User.builder()
                        .email("student@edu.com")
                        .phone("+2348000000002")
                        .password("$2a$12$U5mYQ0YdWXIBNYD7uFT7BuvMb6m/Uu0sgYkL1OAA6.cNiQIJma55m")
                        .fullName("Student User")
                        .userType("STUDENT")
                        .roles(Set.of(studentRole))
                        .enabled(true)
                        .createdAt(Instant.now())
                        .build(),

                User.builder()
                        .email("teacher@edu.com")
                        .phone("+2348000000003")
                        .password("$2a$12$BCyCqFqZQWR23HbN9Od2IeEbJe4tUuOZCnNoJ0kXlDKsR/JpnG8mG")
                        .fullName("Teacher User")
                        .userType("TEACHER")
                        .roles(Set.of(teacherRole))
                        .enabled(true)
                        .createdAt(Instant.now())
                        .build()
        );

        List<User> savedUsers = userRepository.saveAll(users);

        for (User user : savedUsers) {
            if ("STUDENT".equalsIgnoreCase(user.getUserType())) {
                StudentProfile profile = StudentProfile.builder()
                        .user(user)
                        .studentType(StudentType.SCHOOL)
                        .department(defaultDept)
                        .classLevel(defaultClass)
                        .chosenLanguage("English") // safe default
                        .build();
                studentProfileRepository.save(profile);
                System.out.println("👩‍🎓 Created StudentProfile for " + user.getEmail());
            }

            if ("TEACHER".equalsIgnoreCase(user.getUserType())) {
                TeacherProfile profile = TeacherProfile.builder()
                        .user(user)
                        .department(defaultDept)
                        .specialization("General Studies")
                        .build();
                teacherProfileRepository.save(profile);
                System.out.println("👨‍🏫 Created TeacherProfile for " + user.getEmail());
            }
        }

        System.out.println("🌱 Seeded default users and auto-linked profiles");
    }

    private List<String> readCsv(ClassPathResource resource) throws IOException {
        List<String> lines = new ArrayList<>();
        try (var in = resource.getInputStream();
             var reader = new BufferedReader(new InputStreamReader(in))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) lines.add(line.trim());
            }
        }
        return lines;
    }
}
*/