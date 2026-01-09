// src/features/assessments/components/RescheduleModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useRescheduleAssessment } from '../hooks/useWindowReschedule';
import type { RescheduleModalProps } from '../types/rescheduleTypes';
import {
  validateRescheduleTime,
  validateReason,
  calculateNewWindowEnd,
  calculateGraceEnd,
  formatForApi,
  RESCHEDULE_CONSTRAINTS,
  RESCHEDULE_MESSAGES
} from '../types/rescheduleTypes';

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onSuccess
}) => {
  const [newWindowStart, setNewWindowStart] = useState('');
  const [reason, setReason] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const { mutate: rescheduleAssessment, isPending, isError, error } = useRescheduleAssessment();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewWindowStart('');
      setReason('');
      setShowValidation(false);
    }
  }, [isOpen]);

  // Calculate new window end and grace end
  const calculatedTimes = useMemo(() => {
    if (!newWindowStart) return null;

    try {
      const start = new Date(newWindowStart);
      const end = calculateNewWindowEnd(start);
      const grace = calculateGraceEnd(end);

      return {
        start,
        end,
        grace
      };
    } catch {
      return null;
    }
  }, [newWindowStart]);

  // Validate timing
  const timeValidation = useMemo(() => {
    if (!newWindowStart || !lesson.assessmentWindowStart) {
      return { isValid: false, errors: [], warnings: [] };
    }

    return validateRescheduleTime(newWindowStart, lesson.assessmentWindowStart);
  }, [newWindowStart, lesson.assessmentWindowStart]);

  // Validate reason
  const reasonValidation = useMemo(() => {
    if (!showValidation && !reason) {
      return { isValid: true, errors: [] };
    }
    return validateReason(reason);
  }, [reason, showValidation]);

  // Overall validation
  const isFormValid = timeValidation.isValid && reasonValidation.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    if (!isFormValid) return;

    try {
      rescheduleAssessment({
        dailyScheduleId: lesson.progressId,
        newWindowStart: formatForApi(new Date(newWindowStart)),
        reason: reason.trim()
      }, {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        }
      });
    } catch (err) {
      console.error('Failed to reschedule:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                🔄 Reschedule Assessment
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                for {lesson.studentName || 'Student'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              disabled={isPending}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Lesson Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {lesson.lessonTopicTitle}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>📖 {lesson.subjectName}</div>
                {lesson.assessmentId && (
                  <div>🔢 Assessment ID: {lesson.assessmentId}</div>
                )}
              </div>
            </div>

            {/* Original Window - RED WARNING */}
            {lesson.assessmentWindowStart && lesson.assessmentWindowEnd && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-red-900">
                      Original Assessment Window
                    </div>
                    <div className="text-sm text-red-700">
                      This time will be CANCELLED
                    </div>
                  </div>
                </div>
                <div className="text-red-800 font-semibold mt-2">
                  {format(new Date(lesson.assessmentWindowStart), 'EEEE, MMMM dd, yyyy')}
                  <br />
                  {format(new Date(lesson.assessmentWindowStart), 'h:mm a')} - 
                  {format(new Date(lesson.assessmentWindowEnd), 'h:mm a')}
                </div>
              </div>
            )}

            {/* New Window Picker */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-900 mb-2 block">
                  Select New Assessment Time *
                </span>
                <input
                  type="datetime-local"
                  value={newWindowStart}
                  onChange={(e) => setNewWindowStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isPending}
                />
              </label>

              {/* Show calculated new window */}
              {calculatedTimes && (
                <div className="bg-green-50 border border-green-500 rounded-lg p-4">
                  <div className="font-semibold text-green-900 mb-2">
                    ✅ New Assessment Window (1 hour)
                  </div>
                  <div className="text-green-800 space-y-1">
                    <div className="font-semibold">
                      {format(calculatedTimes.start, 'EEEE, MMMM dd, yyyy')}
                    </div>
                    <div className="text-lg font-bold">
                      {format(calculatedTimes.start, 'h:mm a')} - 
                      {format(calculatedTimes.end, 'h:mm a')}
                    </div>
                    <div className="text-sm text-green-700">
                      +30 min grace period until {format(calculatedTimes.grace, 'h:mm a')}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Messages */}
              {showValidation && newWindowStart && (
                <div className="space-y-2">
                  {timeValidation.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                      <span>❌</span>
                      <span>{error}</span>
                    </div>
                  ))}
                  {timeValidation.warnings?.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 rounded p-2">
                      <span>⚠️</span>
                      <span>{warning}</span>
                    </div>
                  ))}
                  {timeValidation.isValid && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded p-2">
                      <span>✅</span>
                      <span>Valid reschedule time</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-semibold text-gray-900 mb-2 block">
                  Reason for Rescheduling *
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you rescheduling? (e.g., I have a meeting at that time, Student requested additional study time)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  minLength={RESCHEDULE_CONSTRAINTS.MIN_REASON_LENGTH}
                  maxLength={RESCHEDULE_CONSTRAINTS.MAX_REASON_LENGTH}
                  required
                  disabled={isPending}
                />
              </label>
              <div className="flex items-center justify-between text-xs">
                <span className={`${
                  reasonValidation.errors.length > 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {reasonValidation.errors[0] || 
                   `Minimum ${RESCHEDULE_CONSTRAINTS.MIN_REASON_LENGTH} characters required`}
                </span>
                <span className={`${
                  reason.length > RESCHEDULE_CONSTRAINTS.MAX_REASON_LENGTH ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {reason.length}/{RESCHEDULE_CONSTRAINTS.MAX_REASON_LENGTH}
                </span>
              </div>
            </div>

            {/* Error Display */}
            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2 text-red-800">
                  <span>❌</span>
                  <div>
                    <div className="font-semibold">Failed to reschedule</div>
                    <div className="text-sm mt-1">
                      {error instanceof Error ? error.message : RESCHEDULE_MESSAGES.ERROR_GENERIC}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <div className="font-semibold text-yellow-900 mb-2">
                ⚠️ Important
              </div>
              <ul className="text-yellow-800 space-y-1 list-disc list-inside">
                <li>The student will be notified of this change</li>
                <li>The original window will be cancelled immediately</li>
                <li>You can cancel this reschedule before the new window starts</li>
                <li>Cannot reschedule after the original window has started</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!isFormValid || isPending}
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Reschedule Assessment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};