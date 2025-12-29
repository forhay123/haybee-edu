package com.edu.platform.repository.projections;

public interface LessonTopicWithCount {

    Long getId();
    Long getSubjectId();
    Integer getWeekNumber();
    String getTopicTitle();
    String getDescription();
    Integer getQuestionCount();
    String getFileUrl();
}
