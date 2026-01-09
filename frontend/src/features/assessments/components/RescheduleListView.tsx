// src/features/assessments/components/RescheduleListView.tsx

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useTeacherReschedules, useCancelReschedule } from '../hooks/useWindowReschedule';
import { canCancelReschedule, RescheduleStatus } from '../types/rescheduleTypes';
import type { WindowRescheduleDto } from '../types/rescheduleTypes';

export const RescheduleListView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | RescheduleStatus>('ALL');
  const [studentFilter, setStudentFilter] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: reschedules = [], isLoading } = useTeacherReschedules();
  const { mutate: cancelReschedule, isPending: isCancelling } = useCancelReschedule();

  // Filter reschedules
  const filteredReschedules = useMemo(() => {
    return reschedules.filter(r => {
      // Status filter
      if (statusFilter === 'ACTIVE' && (!r.isActive || r.cancelledAt)) return false;
      if (statusFilter === 'CANCELLED' && (r.isActive && !r.cancelledAt)) return false;

      // Student filter
      if (studentFilter && !r.studentName?.toLowerCase().includes(studentFilter.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [reschedules, statusFilter, studentFilter]);

  const handleCancelReschedule = (rescheduleId: number) => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    cancelReschedule(
      { rescheduleId, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowCancelModal(null);
          setCancelReason('');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reschedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            🔄 Assessment Reschedules
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all rescheduled assessments
          </p>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{filteredReschedules.length}</span> reschedule
          {filteredReschedules.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Student:</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm w-48"
          />
        </div>

        {(statusFilter !== 'ALL' || studentFilter) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setStudentFilter('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reschedules Table */}
      {filteredReschedules.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600">No reschedules found</p>
          {(statusFilter !== 'ALL' || studentFilter) && (
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subject / Lesson
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Original Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    New Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReschedules.map((reschedule) => (
                  <tr key={reschedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {reschedule.studentName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="font-medium">{reschedule.subjectName}</div>
                      <div className="text-xs text-gray-500">{reschedule.lessonTitle}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="text-red-600 line-through">
                        {format(new Date(reschedule.originalWindowStart), 'MMM dd, h:mm a')}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {format(new Date(reschedule.originalWindowEnd), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="text-green-600 font-medium">
                        {format(new Date(reschedule.newWindowStart), 'MMM dd, h:mm a')}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {format(new Date(reschedule.newWindowEnd), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={reschedule.reason}>
                        {reschedule.reason}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {reschedule.isActive && !reschedule.cancelledAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          ✅ Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          ❌ Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {canCancelReschedule(reschedule) ? (
                        <button
                          onClick={() => setShowCancelModal(reschedule.id)}
                          className="text-red-600 hover:text-red-700 font-medium text-xs"
                        >
                          Cancel
                        </button>
                      ) : reschedule.cancelledAt ? (
                        <span className="text-xs text-gray-500">
                          {format(new Date(reschedule.cancelledAt), 'MMM dd')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Cannot cancel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCancelModal(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Cancel Reschedule
              </h3>
              <p className="text-sm text-gray-600">
                This will restore the original assessment window. Please provide a reason.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
                disabled={isCancelling}
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={isCancelling}
                >
                  Close
                </button>
                <button
                  onClick={() => handleCancelReschedule(showCancelModal)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};