// ============================================================
// FIX 1: IncompleteLessonsDashboard.tsx - Fix reasonMap type
// ============================================================

// frontend/src/features/progress/components/IncompleteLessonsDashboard.tsx

import React, { useState, useMemo } from 'react';
import { useIncompleteLessons, useGroupedIncompleteLessons, useIncompleteLessonsStats } from '../hooks/useIncompleteLessons';
import IncompleteLessonCard from './IncompleteLessonCard';
import IncompleteLessonsFilter from './IncompleteLessonsFilter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { IncompleteLessonReason } from '../types/types';
import type { IncompleteLessonInfo as BackendIncompleteLessonInfo, IncompleteLessonGrouped } from '../hooks/useIncompleteLessons';
import type { IncompleteLessonInfo as FrontendIncompleteLessonInfo } from '../types/types';

interface IncompleteLessonsDashboardProps {
  studentId: number;
}

// Helper function to map backend type to frontend type
const mapBackendToFrontend = (backendLesson: BackendIncompleteLessonInfo): FrontendIncompleteLessonInfo => {
  const reasonMap: Record<string, IncompleteLessonReason> = {
    'MISSED_GRACE_PERIOD': IncompleteLessonReason.NOT_ATTEMPTED,
    'LATE_SUBMISSION': IncompleteLessonReason.INCOMPLETE_ASSESSMENT,
    'NO_SUBMISSION': IncompleteLessonReason.NOT_PASSED
  };

  return {
    lesson_id: backendLesson.lessonTopicId || backendLesson.id || 0,
    lesson_title: backendLesson.lessonTopicTitle,
    subject_name: backendLesson.subjectName,
    scheduled_date: backendLesson.scheduledDate,
    reason: reasonMap[backendLesson.incompleteReason] || IncompleteLessonReason.NOT_ATTEMPTED,
    assessment_id: undefined,
    last_score: undefined,
    passing_score: undefined,
    questions_answered: undefined,
    total_questions: undefined,
    time_limit_minutes: undefined,
  };
};

const IncompleteLessonsDashboard: React.FC<IncompleteLessonsDashboardProps> = ({ studentId }) => {
  const [selectedReason, setSelectedReason] = useState<IncompleteLessonReason | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string | 'all'>('all');
  
  // ✅ Use the correct hooks
  const { grouped, isLoading, error, refetch } = useGroupedIncompleteLessons(studentId);
  const stats = useIncompleteLessonsStats(studentId);

  // Get all incomplete lessons from grouped data
  const allIncompleteLessons = useMemo(() => {
    if (!grouped) return [];
    return [
      ...grouped.missedGracePeriod,
      ...grouped.lateSubmissions,
      ...grouped.noSubmission
    ];
  }, [grouped]);

  // Filter lessons based on selected filters
  const filteredLessons = useMemo(() => {
    let lessons = allIncompleteLessons;
    
    // ✅ FIXED: Filter by reason with proper typing
    if (selectedReason !== 'all' && grouped) {
      const reasonMap: Record<IncompleteLessonReason, 'missedGracePeriod' | 'lateSubmissions' | 'noSubmission'> = {
        [IncompleteLessonReason.NOT_ATTEMPTED]: 'missedGracePeriod',
        [IncompleteLessonReason.INCOMPLETE_ASSESSMENT]: 'lateSubmissions',
        [IncompleteLessonReason.NOT_PASSED]: 'noSubmission'
      };
      
      const groupKey = reasonMap[selectedReason];
      lessons = grouped[groupKey] || [];
    }
    
    // Filter by subject
    if (selectedSubject !== 'all') {
      lessons = lessons.filter((lesson: BackendIncompleteLessonInfo) => 
        lesson.subjectName === selectedSubject
      );
    }
    
    // Map to frontend type
    return lessons.map(mapBackendToFrontend);
  }, [allIncompleteLessons, grouped, selectedReason, selectedSubject]);

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    return Array.from(new Set(
      allIncompleteLessons.map((lesson: BackendIncompleteLessonInfo) => lesson.subjectName)
    ));
  }, [allIncompleteLessons]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading incomplete lessons...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load incomplete lessons. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!allIncompleteLessons || allIncompleteLessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            All Caught Up!
          </CardTitle>
          <CardDescription>
            You have no incomplete lessons. Great job staying on track!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card>
        <CardHeader>
          <CardTitle>Incomplete Lessons</CardTitle>
          <CardDescription>
            You have {allIncompleteLessons.length} incomplete lesson{allIncompleteLessons.length !== 1 ? 's' : ''} that need attention.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <IncompleteLessonsFilter
        selectedReason={selectedReason}
        selectedSubject={selectedSubject}
        subjects={subjects}
        onReasonChange={setSelectedReason}
        onSubjectChange={setSelectedSubject}
        counts={{
          all: stats?.total || 0,
          not_attempted: stats?.missedGracePeriodCount || 0,
          incomplete_assessment: stats?.lateSubmissionCount || 0,
          not_passed: stats?.noSubmissionCount || 0,
        }}
      />

      {/* Summary Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Not Attempted</CardDescription>
              <CardTitle className="text-3xl">
                {stats.missedGracePeriodCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Incomplete Assessments</CardDescription>
              <CardTitle className="text-3xl">
                {stats.lateSubmissionCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Not Passed</CardDescription>
              <CardTitle className="text-3xl">
                {stats.noSubmissionCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filtered Lessons List */}
      {filteredLessons.length === 0 ? (
        <Alert>
          <AlertDescription>
            No lessons match the selected filters.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {filteredLessons.map((lesson: FrontendIncompleteLessonInfo) => (
            <IncompleteLessonCard
              key={lesson.lesson_id}
              lesson={lesson}
              onActionComplete={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IncompleteLessonsDashboard;