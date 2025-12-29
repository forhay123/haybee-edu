import React, { useState } from "react";
import { useGetAspirantAvailableSubjects, useEnrollInSubjects } from "../api/subjectsApi";
import SubjectCard from "./SubjectCard";

interface Props {
  departmentId: number | null;
  enrolledSubjectIds: number[];
}

const AspirantSubjectSelector: React.FC<Props> = ({ departmentId, enrolledSubjectIds }) => {
  const { data: availableSubjects, isLoading } = useGetAspirantAvailableSubjects(departmentId);
  const { mutate: enrollInSubjects, isPending } = useEnrollInSubjects();
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(enrolledSubjectIds));

  const handleToggle = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one subject");
      return;
    }

    enrollInSubjects(Array.from(selectedIds), {
      onSuccess: () => {
        alert("✅ Successfully enrolled in selected subjects!");
      },
      onError: (error: any) => {
        alert(`❌ Error: ${error.response?.data?.message || error.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!availableSubjects || availableSubjects.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-amber-600 dark:text-amber-400 font-medium">No subjects available for selection.</p>
        <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
          Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          📝 Select Your Subjects
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          As an aspirant, you can choose the SSS3 subjects you want to study. 
          Click on subjects to select or deselect them, then click "Enroll in Selected Subjects" to confirm.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
          <strong>Currently selected:</strong> {selectedIds.size} subject{selectedIds.size !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Subject Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableSubjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => handleToggle(subject.id)}
            className={`cursor-pointer transition-all ${
              selectedIds.has(subject.id)
                ? "ring-4 ring-green-500 dark:ring-green-400"
                : "hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600"
            }`}
          >
            <div className="relative">
              <SubjectCard subject={subject} />
              {selectedIds.has(subject.id) && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                  ✓
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={isPending || selectedIds.size === 0}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
        >
          {isPending ? "Enrolling..." : `Enroll in ${selectedIds.size} Selected Subject${selectedIds.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
};

export default AspirantSubjectSelector;