// src/features/assessments/pages/TeacherAssessmentDetailPage.tsx

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAssessment, useAssessmentQuestions, useTogglePublish, useDeleteAssessment, useAssessmentSubmissions } from '../hooks/useAssessments';
import { Pencil, Trash2, Eye, EyeOff, ArrowLeft, Users, FileText, Clock } from 'lucide-react';

export const TeacherAssessmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const assessmentId = Number(id);
  const { data: assessment, isLoading: assessmentLoading } = useAssessment(assessmentId);
  const { data: questions = [], isLoading: questionsLoading } = useAssessmentQuestions(assessmentId, true);
  const { data: submissions = [] } = useAssessmentSubmissions(assessmentId);
  
  const togglePublishMutation = useTogglePublish();
  const deleteAssessmentMutation = useDeleteAssessment();

  const isLoading = assessmentLoading || questionsLoading;

  const handleTogglePublish = async () => {
    try {
      await togglePublishMutation.mutateAsync(assessmentId);
    } catch (error) {
      console.error('Failed to toggle publish:', error);
      alert('Failed to update publish status');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAssessmentMutation.mutateAsync(assessmentId);
      navigate('/assessments/teacher');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete assessment');
    }
  };

  const handleEdit = () => {
    navigate(`/assessments/edit/${assessmentId}`);
  };

  const handleViewSubmissions = () => {
    navigate(`/teacher/assessments/${assessmentId}/submissions`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">Assessment not found</p>
          <button
            onClick={() => navigate('/assessments/teacher')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  assessment.published
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {assessment.published ? 'Published' : 'Draft'}
              </span>
            </div>
            {assessment.description && (
              <p className="text-gray-600 mb-4">{assessment.description}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Questions</p>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Time Limit</p>
              <p className="text-2xl font-bold text-gray-900">
                {assessment.durationMinutes ? `${assessment.durationMinutes}m` : 'None'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <FileText className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="text-lg font-bold text-gray-900">{assessment.type}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Assessment
          </button>

          <button
            onClick={handleTogglePublish}
            disabled={togglePublishMutation.isPending}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              assessment.published
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {assessment.published ? (
              <>
                <EyeOff className="w-4 h-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Publish
              </>
            )}
          </button>

          <button
            onClick={handleViewSubmissions}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Submissions ({submissions.length})
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions</h2>
        
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No questions added yet</p>
            <button
              onClick={handleEdit}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Questions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => {
              // Build options array from optionA, optionB, optionC, optionD
              const options = [
                question.optionA,
                question.optionB,
                question.optionC,
                question.optionD
              ].filter(Boolean);

              return (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium mb-2">{question.questionText}</p>
                      {options.length > 0 && (
                        <div className="space-y-1">
                          {options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 text-sm ${
                                question.correctAnswer === String.fromCharCode(65 + optIdx)
                                  ? 'text-green-600 font-medium'
                                  : 'text-gray-600'
                              }`}
                            >
                              <span className="font-medium">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {option}
                              {question.correctAnswer === String.fromCharCode(65 + optIdx) && (
                                <span className="text-xs bg-green-100 px-2 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-500">
                        Points: {question.marks}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Assessment?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{assessment.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteAssessmentMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAssessmentMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};