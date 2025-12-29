import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAssessmentsBySubject } from '../hooks/useAssessments';
import { AssessmentList } from '../components/AssessmentList';
import { Plus, BookOpen } from 'lucide-react';

export const TeacherAssessmentsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const { data: assessments = [], isLoading } = useAssessmentsBySubject(Number(subjectId));

  const handleCreateAssessment = () => {
    navigate(`/teacher/subjects/${subjectId}/assessments/create`);
  };

  const handleAssessmentClick = (assessment: any) => {
    navigate(`/teacher/assessments/${assessment.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessments</h1>
          <p className="text-gray-600">Manage assessments for this subject</p>
        </div>
        <button
          onClick={handleCreateAssessment}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Assessment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Assessments</p>
              <p className="text-3xl font-bold text-gray-900">{assessments.length}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Published</p>
              <p className="text-3xl font-bold text-green-600">
                {assessments.filter(a => a.published).length}
              </p>
            </div>
            <BookOpen className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Drafts</p>
              <p className="text-3xl font-bold text-gray-600">
                {assessments.filter(a => !a.published).length}
              </p>
            </div>
            <BookOpen className="w-12 h-12 text-gray-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <AssessmentList
        assessments={assessments}
        onAssessmentClick={handleAssessmentClick}
        isLoading={isLoading}
        showStatus={false}
      />
    </div>
  );
};