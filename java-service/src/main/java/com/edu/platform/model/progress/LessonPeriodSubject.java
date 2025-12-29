package com.edu.platform.model.progress;

import com.edu.platform.model.Subject;
import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "lesson_period_subjects", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPeriodSubject {

    @EmbeddedId
    private LessonPeriodSubjectId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("lessonPeriodId")
    @JoinColumn(name = "lesson_period_id")
    private LessonPeriod lessonPeriod;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("subjectId")
    @JoinColumn(name = "subject_id")
    private Subject subject;
}
