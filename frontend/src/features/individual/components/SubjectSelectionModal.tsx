// frontend/src/features/individual/components/SubjectSelectionModal.tsx

import React, { useState, useMemo } from 'react';
import { X, Search, Check, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { useAvailableSubjects, useCreateManualTimetable, useSubjectValidation } from '../hooks/useManualSubjectSelection';
import { SubjectOption } from '../types/individualTypes';

interface SubjectSelectionModalProps {
  studentProfileId: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for selecting subjects manually
 * Shows available subjects, handles selection, and creates schedule
 */
const SubjectSelectionModal: React.FC<SubjectSelectionModalProps> = ({
  studentProfileId,
  onClose,
  onSuccess,
}) => {
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subjects = [], isLoading: loadingSubjects } = useAvailableSubjects(studentProfileId);
  const createMutation = useCreateManualTimetable();
  const { MIN_SUBJECTS, MAX_SUBJECTS, validateSelection } = useSubjectValidation();

  // Filter subjects by search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
    );
  }, [subjects, searchQuery]);

  // Group subjects by type (Core vs Elective) if needed
  const { coreSubjects, electiveSubjects } = useMemo(() => {
    const core: SubjectOption[] = [];
    const elective: SubjectOption[] = [];

    filteredSubjects.forEach((subject) => {
      // You can add logic here to determine if a subject is core or elective
      // For now, we'll just group them all as elective
      elective.push(subject);
    });

    return { coreSubjects: core, electiveSubjects: elective };
  }, [filteredSubjects]);

  const toggleSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        if (prev.length >= MAX_SUBJECTS) {
          return prev; // Don't add if at max
        }
        return [...prev, subjectId];
      }
    });
  };

  const handleGenerate = async () => {
    const validation = validateSelection(selectedSubjectIds);
    
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      await createMutation.mutateAsync({
        studentProfileId,
        subjectIds: selectedSubjectIds,
        academicYear: '2024/2025',
      });
      onSuccess();
      onClose();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const validation = validateSelection(selectedSubjectIds);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Subjects</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select {MIN_SUBJECTS}-{MAX_SUBJECTS} subjects to create your personalized schedule
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Selection Counter */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 bg-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Selected: <span className="text-indigo-600 font-bold">{selectedSubjectIds.length}</span> / {MAX_SUBJECTS}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: MAX_SUBJECTS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-6 rounded-full transition-colors ${
                        i < selectedSubjectIds.length
                          ? 'bg-indigo-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingSubjects ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading subjects...</span>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No subjects found' : 'No subjects available'}
              </h3>
              <p className="text-gray-600">
                {searchQuery
                  ? 'Try a different search term'
                  : 'No subjects are available for your class'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubjects.map((subject) => {
                const isSelected = selectedSubjectIds.includes(subject.id);
                const isDisabled = !isSelected && selectedSubjectIds.length >= MAX_SUBJECTS;

                return (
                  <button
                    key={subject.id}
                    onClick={() => !isDisabled && toggleSubject(subject.id)}
                    disabled={isDisabled}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Subject Info */}
                    <div className="pr-8">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {subject.name}
                      </h4>
                      {subject.code && (
                        <p className="text-xs text-gray-500 font-mono">
                          {subject.code}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-5 border-t border-gray-200 rounded-b-2xl">
          {/* Validation Message */}
          {!validation.isValid && selectedSubjectIds.length > 0 && (
            <div className="mb-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{validation.error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedSubjectIds.length < MIN_SUBJECTS
                  ? `Select ${MIN_SUBJECTS - selectedSubjectIds.length} more`
                  : validation.isValid
                  ? 'Ready to generate'
                  : ''}
              </span>
              <button
                onClick={handleGenerate}
                disabled={!validation.isValid || createMutation.isPending}
                className={`px-8 py-2.5 rounded-lg font-semibold transition-all ${
                  validation.isValid && !createMutation.isPending
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Generate Schedule'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelectionModal;