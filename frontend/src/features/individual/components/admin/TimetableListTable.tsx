// frontend/src/features/individual/components/admin/TimetableListTable.tsx

import React, { useState } from "react";
import { FileText, Eye, Trash2, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Wrench, RotateCcw } from "lucide-react";
import { IndividualTimetableDto, StudentHealthData, getStatusColor, formatFileSize } from "../../types/individualTypes";

interface TimetableListTableProps {
  timetables: IndividualTimetableDto[];
  selectedIds: number[];
  onSelect: (id: number) => void;
  onSelectAll: (selectAll: boolean) => void;
  onDelete: (id: number) => void;
  onReprocess: (id: number) => void;
  onView: (id: number) => void;
  onRepair?: (studentId: number, studentName: string) => void;
  onRegenerate?: (studentId: number, studentName: string) => void;
  studentHealthMap?: Record<number, StudentHealthData>;
}

const TimetableListTable: React.FC<TimetableListTableProps> = ({
  timetables,
  selectedIds,
  onSelect,
  onSelectAll,
  onDelete,
  onReprocess,
  onView,
  onRepair,
  onRegenerate,
  studentHealthMap,
}) => {
  const [sortField, setSortField] = useState<keyof IndividualTimetableDto>("uploadedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof IndividualTimetableDto) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedTimetables = [...timetables].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "PROCESSING":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const allSelected = timetables.length > 0 && selectedIds.length === timetables.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < timetables.length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("studentName")}>
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("originalFilename")}>
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("processingStatus")}>
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extraction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort("uploadedAt")}>
                Uploaded
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTimetables.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No timetables found</p>
                </td>
              </tr>
            ) : (
              sortedTimetables.map((timetable) => {
                const health = studentHealthMap?.[timetable.studentProfileId];
                const needsRepair = health?.needsRepair || false;
                const hasSchedulesWithoutTopics = health?.schedulesWithoutLessonTopics ? health.schedulesWithoutLessonTopics > 0 : false;

                return (
                  <tr key={timetable.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(timetable.id) ? "bg-indigo-50" : ""}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={selectedIds.includes(timetable.id)} onChange={() => onSelect(timetable.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{timetable.studentName}</div>
                      <div className="text-xs text-gray-500">ID: {timetable.studentProfileId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900 max-w-xs truncate">{timetable.originalFilename}</div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(timetable.fileSizeBytes)} • {timetable.fileType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(timetable.processingStatus)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timetable.processingStatus)}`}>{timetable.processingStatus}</span>
                      </div>
                      {timetable.processingError && <div className="mt-1 text-xs text-red-600 max-w-xs truncate">{timetable.processingError}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {timetable.processingStatus === "COMPLETED" ? (
                        <div className="text-sm">
                          <div className="text-gray-900">{timetable.totalPeriodsExtracted || 0} periods</div>
                          <div className="text-gray-500">{timetable.subjectsIdentified || 0} subjects</div>
                          {timetable.confidenceScore && <div className="text-xs text-gray-500">{(timetable.confidenceScore * 100).toFixed(0)}% confidence</div>}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{new Date(timetable.uploadedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(timetable.uploadedAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {timetable.processingStatus === "COMPLETED" && (
                        <>
                          {health ? (
                            needsRepair ? (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <div>
                                  <div className="text-sm font-medium text-amber-600">Needs Repair</div>
                                  <div className="text-xs text-gray-500">
                                    {health.totalIssues} issue{health.totalIssues > 1 ? "s" : ""}
                                    {hasSchedulesWithoutTopics && <span className="text-red-600"> • No topics</span>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">Healthy</span>
                              </div>
                            )
                          ) : (
                            <span className="text-sm text-gray-400">Checking...</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {onRegenerate && timetable.processingStatus === "COMPLETED" && hasSchedulesWithoutTopics && (
                          <button
                            onClick={() => onRegenerate(timetable.studentProfileId, timetable.studentName)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Regenerate schedules (assigns lesson topics)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {onRepair && timetable.processingStatus === "COMPLETED" && needsRepair && !hasSchedulesWithoutTopics && (
                          <button
                            onClick={() => onRepair(timetable.studentProfileId, timetable.studentName)}
                            className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded transition-colors"
                            title={`Repair schedules (${health?.totalIssues || 0} issues)`}
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onView(timetable.id)} className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {timetable.processingStatus === "FAILED" && (
                          <button onClick={() => onReprocess(timetable.id)} className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors" title="Reprocess">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onDelete(timetable.id)} className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimetableListTable;