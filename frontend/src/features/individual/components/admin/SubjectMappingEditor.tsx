// frontend/src/features/individual/components/admin/SubjectMappingEditor.tsx

import React, { useState, useMemo } from "react";
import { Search, CheckCircle, XCircle, AlertCircle, Save } from "lucide-react";
import {
  useTimetableEntries,
  useAvailableSubjects,
  useUpdateSubjectMapping,
  useSubjectSuggestions,
} from "../../hooks/admin/useSubjectMapping";

interface SubjectMappingEditorProps {
  timetableId: number;
}

const SubjectMappingEditor: React.FC<SubjectMappingEditorProps> = ({
  timetableId,
}) => {
  const { data: entries = [], isLoading: entriesLoading } = useTimetableEntries(timetableId);
  const { data: availableSubjects = [], isLoading: subjectsLoading } = useAvailableSubjects();
  const updateMapping = useUpdateSubjectMapping();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Filter subjects by search query
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return availableSubjects;
    const query = searchQuery.toLowerCase();
    return availableSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
    );
  }, [availableSubjects, searchQuery]);

  const handleStartEdit = (index: number, currentSubjectId?: number) => {
    setEditingIndex(index);
    setSelectedSubjectId(currentSubjectId || null);
    setSearchQuery("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setSelectedSubjectId(null);
    setSearchQuery("");
  };

  const handleSaveMapping = () => {
    if (editingIndex === null || selectedSubjectId === null) return;

    updateMapping.mutate(
      {
        timetableId,
        entryIndex: editingIndex,
        subjectId: selectedSubjectId,
      },
      {
        onSuccess: () => {
          handleCancelEdit();
        },
      }
    );
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const percentage = (confidence * 100).toFixed(0);
    let colorClass = "bg-gray-100 text-gray-700";

    if (confidence >= 0.9) colorClass = "bg-green-100 text-green-700";
    else if (confidence >= 0.7) colorClass = "bg-yellow-100 text-yellow-700";
    else colorClass = "bg-red-100 text-red-700";

    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorClass}`}>
        {percentage}%
      </span>
    );
  };

  if (entriesLoading || subjectsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const unmappedEntries = entries.filter((e) => !e.subjectId);
  const lowConfidenceEntries = entries.filter(
    (e) => e.mappingConfidence && e.mappingConfidence < 0.7
  );
  const needsAttention = [...unmappedEntries, ...lowConfidenceEntries];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subject Mappings</h3>
          <p className="text-sm text-gray-600 mt-1">
            {entries.length} total entries • {unmappedEntries.length} unmapped •{" "}
            {lowConfidenceEntries.length} low confidence
          </p>
        </div>
      </div>

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">
                {needsAttention.length} {needsAttention.length === 1 ? "entry needs" : "entries need"} attention
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                These entries are unmapped or have low confidence scores. Please review and update.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const isEditing = editingIndex === index;
          const currentSubject = availableSubjects.find((s) => s.id === entry.subjectId);

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                !entry.subjectId
                  ? "border-red-200 bg-red-50"
                  : entry.mappingConfidence && entry.mappingConfidence < 0.7
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {entry.dayOfWeek} • Period {entry.periodNumber}
                    </span>
                    {entry.startTime && entry.endTime && (
                      <span className="text-xs text-gray-500">
                        {entry.startTime} - {entry.endTime}
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Extracted: "{entry.subjectName}"
                    </p>
                  </div>

                  {!isEditing && currentSubject && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-gray-700">
                        Mapped to: <strong>{currentSubject.name}</strong>
                      </p>
                      {getConfidenceBadge(entry.mappingConfidence)}
                    </div>
                  )}

                  {!isEditing && !currentSubject && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-700 font-medium">Not mapped</p>
                    </div>
                  )}

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="mt-3 space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search subjects..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                      </div>

                      {/* Subject List */}
                      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredSubjects.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No subjects found
                          </div>
                        ) : (
                          filteredSubjects.map((subject) => (
                            <button
                              key={subject.id}
                              onClick={() => setSelectedSubjectId(subject.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedSubjectId === subject.id
                                  ? "bg-indigo-50 border-l-4 border-indigo-600"
                                  : ""
                              }`}
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {subject.name}
                              </p>
                              {subject.code && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Code: {subject.code}
                                </p>
                              )}
                              {subject.departmentName && (
                                <p className="text-xs text-gray-500">
                                  {subject.departmentName}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveMapping}
                          disabled={selectedSubjectId === null || updateMapping.isPending}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {updateMapping.isPending ? "Saving..." : "Save Mapping"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {!isEditing && (
                  <button
                    onClick={() => handleStartEdit(index, entry.subjectId)}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    {currentSubject ? "Change" : "Map Subject"}
                  </button>
                )}
              </div>

              {/* Suggestions */}
              {!isEditing && !entry.subjectId && (
                <SubjectSuggestions
                  extractedName={entry.subjectName}
                  onSelect={(subjectId) => handleStartEdit(index, subjectId)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Suggestions Component
const SubjectSuggestions: React.FC<{
  extractedName: string;
  onSelect: (subjectId: number) => void;
}> = ({ extractedName, onSelect }) => {
  const { suggestions } = useSubjectSuggestions(extractedName);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-700 mb-2">Suggestions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelect(suggestion.id)}
            className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {suggestion.name} ({(suggestion.similarityScore * 100).toFixed(0)}%)
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubjectMappingEditor;