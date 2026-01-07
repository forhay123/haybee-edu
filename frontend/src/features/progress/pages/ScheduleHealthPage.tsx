// frontend/src/features/progress/pages/ScheduleHealthPage.tsx

import React from 'react';
import { useAllStudentsHealth, useHealthSummary, useFixAllStudents } from '../hooks/useScheduleHealth';
import { ScheduleHealthTable } from '../components/ScheduleHealthTable';

export const ScheduleHealthPage: React.FC = () => {
  const { data: students, isLoading, refetch } = useAllStudentsHealth();
  const { data: summary } = useHealthSummary();
  const fixAll = useFixAllStudents();

  const handleFixAll = async () => {
    if (confirm('Fix schedules for all students with issues? This may take a while.')) {
      await fixAll.mutateAsync();
      refetch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Schedule Health Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and fix schedule generation for CLASS students (SCHOOL, HOME, ASPIRANT)
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
            <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
            <div className="text-sm text-gray-600">Healthy</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
            <div className="text-2xl font-bold text-yellow-600">{summary.missingDaily}</div>
            <div className="text-sm text-gray-600">Missing Daily</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
            <div className="text-2xl font-bold text-red-600">{summary.noSchedules}</div>
            <div className="text-sm text-gray-600">No Schedules</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-400">
            <div className="text-2xl font-bold text-orange-600">{summary.partial}</div>
            <div className="text-sm text-gray-600">Partial</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <button
          onClick={handleFixAll}
          disabled={fixAll.isPending || !summary || summary.needsAttention === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {fixAll.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Fixing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fix All Issues
            </>
          )}
        </button>
      </div>

      {/* Health Table */}
      <div className="bg-white rounded-lg shadow">
        <ScheduleHealthTable 
          students={students || []} 
          isLoading={isLoading}
        />
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Understanding Health Status:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✅ <strong>Healthy:</strong> All schedules generated correctly</li>
          <li>⚠️ <strong>Missing Daily:</strong> Weekly schedules exist but daily schedules not generated - Click "Generate"</li>
          <li>⚠️ <strong>Partial:</strong> Some daily schedules missing - Click "Regenerate"</li>
          <li>❌ <strong>No Schedules:</strong> No weekly schedules configured - Set up weekly schedules first</li>
          <li>ℹ️ <strong>Individual:</strong> Uses individual timetable system (managed separately)</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleHealthPage;