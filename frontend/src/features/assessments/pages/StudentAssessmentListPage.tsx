// src/features/assessments/pages/StudentAssessmentListPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, AlertCircle, Filter } from 'lucide-react';
import { useCurrentStudentProfileId } from '../../studentProfiles/hooks/useStudentProfiles';
import { useStudentAssessments } from '../hooks/useAssessments';
import { useGradebookAssessments, useGradebookStats } from '../hooks/useGradebookAssessments';
import { AssessmentAccessCard, CompactAssessmentAccessCard } from '../components/AssessmentAccessCard';
import { GradebookAssessmentCard } from '../components/GradebookAssessmentCard';
import { AssessmentType } from '../types/assessmentTypes';
import { isGradebookAssessment, isLessonAssessment } from '../types/gradebookTypes';

type TabType = 'all' | 'lessons' | 'gradebook';
type SortBy = 'dueDate' | 'title' | 'subject' | 'status';

export const StudentAssessmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const { studentProfileId, isLoading: loadingProfile } = useCurrentStudentProfileId();

  // Filters and sorting
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('dueDate');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Fetch lesson assessments (LESSON_TOPIC_ASSESSMENT from regular API)
  const {
    data: lessonAssessments = [],
    isLoading: loadingLessons,
  } = useStudentAssessments(studentProfileId || 0);

  // Fetch gradebook assessments (QUIZ, CLASSWORK, etc.)
  const {
    data: gradebookAssessments = [],
    isLoading: loadingGradebook,
  } = useGradebookAssessments();

  // Get gradebook stats
  const { stats: gradebookStats } = useGradebookStats();

  // Combine assessments based on active tab
  const filteredAssessments = useMemo(() => {
    let combined: any[] = [];

    if (activeTab === 'all' || activeTab === 'lessons') {
      // Add lesson assessments
      const lessons = lessonAssessments
        .filter(a => a.type === AssessmentType.LESSON_TOPIC_ASSESSMENT)
        .map(a => ({ ...a, source: 'lesson' as const }));
      combined = [...combined, ...lessons];
    }

    if (activeTab === 'all' || activeTab === 'gradebook') {
      // Add gradebook assessments
      const gradebook = gradebookAssessments.map(a => ({ 
        ...a, 
        source: 'gradebook' as const 
      }));
      combined = [...combined, ...gradebook];
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      combined = combined.filter(a => 
        a.subjectName?.toLowerCase().includes(subjectFilter.toLowerCase())
      );
    }

    // Apply status filter for lesson assessments
    if (statusFilter !== 'all' && activeTab !== 'gradebook') {
      if (statusFilter === 'submitted') {
        combined = combined.filter(a => a.hasSubmitted === true);
      } else if (statusFilter === 'pending') {
        combined = combined.filter(a => a.hasSubmitted === false);
      }
    }

    // Sort assessments
    combined.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          // For lesson assessments, use assessmentWindowEnd
          // For gradebook assessments, use dueDate
          const dateA = a.source === 'lesson' 
            ? a.assessmentWindowEnd || a.dueDate
            : a.dueDate;
          const dateB = b.source === 'lesson'
            ? b.assessmentWindowEnd || b.dueDate
            : b.dueDate;
          
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        }
        case 'title':
          return a.title.localeCompare(b.title);
        case 'subject':
          return (a.subjectName || '').localeCompare(b.subjectName || '');
        case 'status': {
          if (a.hasSubmitted === b.hasSubmitted) return 0;
          return a.hasSubmitted ? 1 : -1;
        }
        default:
          return 0;
      }
    });

    return combined;
  }, [
    lessonAssessments, 
    gradebookAssessments, 
    activeTab, 
    statusFilter, 
    subjectFilter,
    sortBy
  ]);

  // Get unique subjects for filter
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    [...lessonAssessments, ...gradebookAssessments].forEach(a => {
      if (a.subjectName) subjectSet.add(a.subjectName);
    });
    return Array.from(subjectSet).sort();
  }, [lessonAssessments, gradebookAssessments]);

  // Calculate stats
  const stats = useMemo(() => {
    const lessonStats = {
      total: lessonAssessments.length,
      submitted: lessonAssessments.filter(a => a.hasSubmitted).length,
      pending: lessonAssessments.filter(a => !a.hasSubmitted).length,
    };

    return {
      lessons: lessonStats,
      gradebook: gradebookStats,
      combined: {
        total: lessonStats.total + gradebookStats.total,
        submitted: lessonStats.submitted + gradebookStats.completed,
        pending: lessonStats.pending + gradebookStats.pending,
      }
    };
  }, [lessonAssessments, gradebookStats]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!studentProfileId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">
            Unable to load student profile. Please log in again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessmentsss</h1>
        <p className="text-gray-600">
          View and manage your lesson and gradebook assessments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Assessments</div>
          <div className="text-2xl font-bold text-gray-900">{stats.combined.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.combined.submitted}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.combined.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Urgent</div>
          <div className="text-2xl font-bold text-red-600">
            {gradebookStats.dueSoon + gradebookStats.overdue}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All ({stats.combined.total})
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'lessons'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Lessons ({stats.lessons.total})
            </button>
            <button
              onClick={() => setActiveTab('gradebook')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'gradebook'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              Gradebook ({stats.gradebook.total})
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="title">Sort by Title</option>
              <option value="subject">Sort by Subject</option>
              <option value="status">Sort by Status</option>
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>

            {activeTab !== 'gradebook' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
              </select>
            )}

            {(subjectFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSubjectFilter('all');
                  setStatusFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assessment List */}
      {loadingLessons || loadingGradebook ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assessments...</p>
          </div>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No assessments found</p>
          <p className="text-gray-500 text-sm">
            {activeTab === 'lessons' && 'No lesson assessments available'}
            {activeTab === 'gradebook' && 'No gradebook assessments available'}
            {activeTab === 'all' && 'No assessments available at this time'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAssessments.map((assessment) => (
            <React.Fragment key={`${assessment.source}-${assessment.id}`}>
              {assessment.source === 'lesson' ? (
                <AssessmentAccessCard
                  assessment={assessment}
                  studentProfileId={studentProfileId}
                  onStartAssessment={() => {
                    console.log('🚀 START ASSESSMENT CLICKED:', {
                      id: assessment.id,
                      title: assessment.title,
                      navigatingTo: `/assessments/${assessment.id}/take`
                    });
                    navigate(`/assessments/${assessment.id}/take`);
                  }}
                  onViewResults={() => {
                    console.log('📊 VIEW RESULTS CLICKED:', {
                      submissionId: assessment.submissionId
                    });
                    navigate(`/submissions/${assessment.submissionId}/results`)
                  }}
                />
              ) : (
                <GradebookAssessmentCard assessment={assessment} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};