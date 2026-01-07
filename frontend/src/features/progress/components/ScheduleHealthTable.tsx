// frontend/src/features/progress/components/ScheduleHealthTable.tsx

import React, { useMemo, useState } from 'react';
import { ScheduleHealthDto } from '../api/scheduleHealthApi';
import { useFixStudentSchedules } from '../hooks/useScheduleHealth';

interface Props {
  students: ScheduleHealthDto[];
  isLoading: boolean;
}

export const ScheduleHealthTable: React.FC<Props> = ({ students, isLoading }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const fixStudent = useFixStudentSchedules();

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesStatus = statusFilter === 'ALL' || student.healthStatus === statusFilter;
      const matchesSearch = 
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.className && student.className.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [students, statusFilter, searchTerm]);

  const handleFix = async (studentId: number) => {
    if (confirm(`Generate schedules for student ${studentId}?`)) {
      await fixStudent.mutateAsync(studentId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ Healthy</span>;
      case 'MISSING_DAILY':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">⚠️ Missing Daily</span>;
      case 'PARTIAL':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">⚠️ Partial</span>;
      case 'NO_SCHEDULES':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">❌ No Schedules</span>;
      case 'INDIVIDUAL_STUDENT':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">ℹ️ Individual</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 flex gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or class..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="HEALTHY">Healthy</option>
          <option value="MISSING_DAILY">Missing Daily</option>
          <option value="PARTIAL">Partial</option>
          <option value="NO_SCHEDULES">No Schedules</option>
          <option value="INDIVIDUAL_STUDENT">Individual</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Weekly</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Daily</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <tr key={student.studentId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.studentId}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.className || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.studentTypeDisplay}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{student.weeklySchedulesCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                  {student.dailySchedulesCount}/{student.expectedDailySchedules}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(student.healthStatus)}
                  <div className="text-xs text-gray-500 mt-1">{student.statusMessage}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {student.canGenerate && (
                    <button
                      onClick={() => handleFix(student.studentId)}
                      disabled={fixStudent.isPending}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Generate
                    </button>
                  )}
                  {student.canRegenerate && (
                    <button
                      onClick={() => handleFix(student.studentId)}
                      disabled={fixStudent.isPending}
                      className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  )}
                  {!student.canGenerate && !student.canRegenerate && (
                    <span className="text-xs text-gray-500">{student.actionRequired}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-gray-500">No students found</div>
        )}
      </div>
    </div>
  );
};