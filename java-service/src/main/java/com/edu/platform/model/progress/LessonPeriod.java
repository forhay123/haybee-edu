package com.edu.platform.model.progress;

import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.LessonTopic;
import com.edu.platform.model.Subject;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "lesson_periods", schema = "academic",
       uniqueConstraints = @UniqueConstraint(columnNames = {"class_id", "period_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_number", nullable = false)
    private int periodNumber;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_subject_id")
    private Subject defaultSubject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_topic_id")
    private LessonTopic defaultTopic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    @Builder.Default
    @OneToMany(mappedBy = "lessonPeriod", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<LessonPeriodSubject> periodSubjects = new HashSet<>();

}
