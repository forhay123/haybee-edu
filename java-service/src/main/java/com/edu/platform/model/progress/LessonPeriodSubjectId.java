package com.edu.platform.model.progress;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;


@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPeriodSubjectId implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long lessonPeriodId;
    private Long subjectId;
}
