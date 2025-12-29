// frontend/src/features/individual/components/admin/PendingAssignmentsTable.tsx

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Calendar,
  Clock,
  User,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Edit,
} from "lucide-react";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { getUrgencyLevel } from "../../types/assignmentTypes";

interface PendingAssignmentsTableProps {
  assignments: PendingAssignmentDto[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onAssignClick: (assignment: PendingAssignmentDto) => void;
  onBulkAssignClick: () => void;
  isLoading?: boolean;
}

type SortField = "scheduledDate" | "studentName" | "subjectName" | "daysPending";
type SortDirection = "asc" | "desc";

export function PendingAssignmentsTable({
  assignments,
  selectedIds,
  onSelectionChange,
  onAssignClick,
  onBulkAssignClick,
  isLoading = false,
}: PendingAssignmentsTableProps) {
  const [sortField, setSortField] = useState<SortField>("daysPending");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedAssignments = useMemo(() => {
    const sorted = [...assignments].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "scheduledDate") {
        aValue = new Date(a.scheduledDate).getTime();
        bValue = new Date(b.scheduledDate).getTime();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [assignments, sortField, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(assignments.map((a) => a.scheduleId));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (scheduleId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, scheduleId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== scheduleId));
    }
  };

  const allSelected = assignments.length > 0 && selectedIds.length === assignments.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < assignments.length;

  const getUrgencyBadge = (daysPending: number) => {
    const urgency = getUrgencyLevel(daysPending);
    
    const styles = {
      critical: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
    };

    const labels = {
      critical: "Overdue",
      high: "Today",
      medium: "Tomorrow",
      low: `${daysPending}d`,
    };

    return (
      <Badge className={styles[urgency]} variant="outline">
        {labels[urgency]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">
            Pending Assignments ({assignments.length})
          </h3>
          {selectedIds.length > 0 && (
            <Badge variant="secondary">{selectedIds.length} selected</Badge>
          )}
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={onBulkAssignClick} size="sm">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Bulk Assign ({selectedIds.length})
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">All caught up!</p>
          <p className="text-sm text-gray-500 mt-1">
            No pending topic assignments at the moment.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => handleSort("studentName")}
                  >
                    <User className="h-4 w-4" />
                    Student
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => handleSort("subjectName")}
                  >
                    <BookOpen className="h-4 w-4" />
                    Subject
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Week</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => handleSort("scheduledDate")}
                  >
                    <Calendar className="h-4 w-4" />
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Period</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-gray-900"
                    onClick={() => handleSort("daysPending")}
                  >
                    <Clock className="h-4 w-4" />
                    Urgency
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Suggestions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssignments.map((assignment) => (
                <TableRow key={assignment.scheduleId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(assignment.scheduleId)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(assignment.scheduleId, checked as boolean)
                      }
                      aria-label={`Select ${assignment.studentName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{assignment.studentName}</p>
                      <p className="text-xs text-gray-500">{assignment.className}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{assignment.subjectName}</Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.weekNumber ? (
                      <span className="text-sm">Week {assignment.weekNumber}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(assignment.scheduledDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {assignment.dayOfWeek}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      Period {assignment.periodNumber}
                    </span>
                    <p className="text-xs text-gray-500">
                      {assignment.startTime} - {assignment.endTime}
                    </p>
                  </TableCell>
                  <TableCell>{getUrgencyBadge(assignment.daysPending)}</TableCell>
                  <TableCell>
                    {assignment.suggestedTopics &&
                    assignment.suggestedTopics.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">
                          {assignment.suggestedTopics.length}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">None</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAssignClick(assignment)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}