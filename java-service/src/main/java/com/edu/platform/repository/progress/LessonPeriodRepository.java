package com.edu.platform.repository.progress;

import com.edu.platform.model.progress.LessonPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LessonPeriodRepository extends JpaRepository<LessonPeriod, Long> {

    List<LessonPeriod> findByClassEntityId(Long classId);

    Optional<LessonPeriod> findByClassEntityIdAndPeriodNumber(Long classId, int periodNumber);

    boolean existsByClassEntityIdAndPeriodNumber(Long classId, int periodNumber);
}
