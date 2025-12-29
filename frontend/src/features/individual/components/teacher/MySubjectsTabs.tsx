// ============================================================
// FILE 1: MySubjectsTabs.tsx
// Path: frontend/src/features/individual/components/teacher/MySubjectsTabs.tsx
// ============================================================

import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { BookOpen } from "lucide-react";

interface MySubjectsTabsProps {
  subjectsWithCounts: Record<string, number>;
  selectedSubject: number | null;
  onSubjectSelect: (subjectId: number | null) => void;
}

export function MySubjectsTabs({
  subjectsWithCounts,
  selectedSubject,
  onSubjectSelect,
}: MySubjectsTabsProps) {
  // Convert subject names to IDs (you may need to pass actual IDs from backend)
  const subjects = Object.entries(subjectsWithCounts).map(([name, count], index) => ({
    id: index + 1, // Temporary ID mapping
    name,
    count,
  }));

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center gap-2 overflow-x-auto pb-px">
        {/* All Subjects Tab */}
        <button
          onClick={() => onSubjectSelect(null)}
          className={`
            flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
            ${
              selectedSubject === null
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }
          `}
        >
          <BookOpen className="h-4 w-4" />
          All Subjects
          <Badge variant="secondary" className="ml-1">
            {Object.values(subjectsWithCounts).reduce((sum, count) => sum + count, 0)}
          </Badge>
        </button>

        {/* Individual Subject Tabs */}
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => onSubjectSelect(subject.id)}
            className={`
              flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${
                selectedSubject === subject.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }
            `}
          >
            {subject.name}
            {subject.count > 0 && (
              <Badge
                variant={selectedSubject === subject.id ? "default" : "secondary"}
                className="ml-1"
              >
                {subject.count}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}