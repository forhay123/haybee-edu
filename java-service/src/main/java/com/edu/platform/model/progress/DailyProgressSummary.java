package com.edu.platform.model.progress;

import com.edu.platform.model.StudentProfile;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "daily_progress_summary")
public class DailyProgressSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_profile_id")
    private StudentProfile studentProfile;

    private LocalDate date;

    private int completedPeriods;

    private int totalPeriods;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StudentProfile getStudentProfile() { return studentProfile; }
    public void setStudentProfile(StudentProfile studentProfile) { this.studentProfile = studentProfile; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public int getCompletedPeriods() { return completedPeriods; }
    public void setCompletedPeriods(int completedPeriods) { this.completedPeriods = completedPeriods; }

    public int getTotalPeriods() { return totalPeriods; }
    public void setTotalPeriods(int totalPeriods) { this.totalPeriods = totalPeriods; }
}
