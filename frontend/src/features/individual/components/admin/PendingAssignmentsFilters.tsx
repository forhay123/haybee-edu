// frontend/src/features/individual/components/admin/PendingAssignmentsFilters.tsx

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { 
  Filter, 
  X, 
  Search,
  Calendar,
  BookOpen,
  User,
  AlertCircle
} from "lucide-react";
import type { PendingAssignmentsFilter } from "../../types/assignmentTypes";

interface PendingAssignmentsFiltersProps {
  filters: PendingAssignmentsFilter;
  onFiltersChange: (filters: PendingAssignmentsFilter) => void;
  subjects: Array<{ id: number; name: string }>;
  students: Array<{ id: number; name: string }>;
}

export function PendingAssignmentsFilters({
  filters,
  onFiltersChange,
  subjects,
  students,
}: PendingAssignmentsFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const hasActiveFilters =
    filters.weekNumber ||
    filters.subjectId ||
    filters.studentProfileId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.onlyUrgent ||
    filters.onlyWithoutSuggestions;

  const activeFilterCount = [
    filters.weekNumber,
    filters.subjectId,
    filters.studentProfileId,
    filters.dateFrom,
    filters.dateTo,
    filters.onlyUrgent,
    filters.onlyWithoutSuggestions,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({});
    setStudentSearch("");
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-sm"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Week Number Filter */}
          <div>
            <Label htmlFor="weekNumber" className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Week Number
            </Label>
            <Input
              id="weekNumber"
              type="number"
              min="1"
              max="52"
              placeholder="e.g., 12"
              value={filters.weekNumber || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  weekNumber: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Subject Filter */}
          <div>
            <Label htmlFor="subject" className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" />
              Subject
            </Label>
            <select
              id="subject"
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.subjectId || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  subjectId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <Label htmlFor="student" className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              Student
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="studentSearch"
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {studentSearch && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      onClick={() => {
                        onFiltersChange({
                          ...filters,
                          studentProfileId: student.id,
                        });
                        setStudentSearch(student.name);
                      }}
                    >
                      {student.name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    No students found
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Date From */}
          <div>
            <Label htmlFor="dateFrom" className="mb-2 block">
              Date From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
            />
          </div>

          {/* Date To */}
          <div>
            <Label htmlFor="dateTo" className="mb-2 block">
              Date To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
            />
          </div>

          {/* Toggle Filters */}
          <div className="flex flex-col gap-2">
            <Label className="mb-1">Quick Filters</Label>
            <div className="flex flex-col gap-2">
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  filters.onlyUrgent
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    onlyUrgent: !filters.onlyUrgent,
                  })
                }
              >
                <AlertCircle className="h-4 w-4" />
                Show Only Urgent
                {filters.onlyUrgent && (
                  <X
                    className="h-3 w-3 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFiltersChange({ ...filters, onlyUrgent: false });
                    }}
                  />
                )}
              </button>

              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  filters.onlyWithoutSuggestions
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    onlyWithoutSuggestions: !filters.onlyWithoutSuggestions,
                  })
                }
              >
                <Filter className="h-4 w-4" />
                Without Suggestions
                {filters.onlyWithoutSuggestions && (
                  <X
                    className="h-3 w-3 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFiltersChange({
                        ...filters,
                        onlyWithoutSuggestions: false,
                      });
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display (when collapsed) */}
      {!isExpanded && hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.weekNumber && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, weekNumber: undefined })}
            >
              Week {filters.weekNumber}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.subjectId && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, subjectId: undefined })}
            >
              {subjects.find((s) => s.id === filters.subjectId)?.name || "Subject"}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.studentProfileId && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() =>
                onFiltersChange({ ...filters, studentProfileId: undefined })
              }
            >
              {students.find((s) => s.id === filters.studentProfileId)?.name ||
                "Student"}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.onlyUrgent && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer bg-orange-100"
              onClick={() => onFiltersChange({ ...filters, onlyUrgent: false })}
            >
              Urgent Only
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}