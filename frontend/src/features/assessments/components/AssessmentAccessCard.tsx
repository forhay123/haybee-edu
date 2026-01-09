// ============================================================
// FILE: AssessmentAccessCard.tsx (FIXED - Navigation Issue)
// Location: frontend/src/features/assessments/components/AssessmentAccessCard.tsx
// ============================================================

import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';
import { AssessmentStatusBadge } from '../../../components/ui/assessmentStatusBadge';
import { CountdownTimer } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import { Lock, Unlock, RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import type { Assessment } from '../types/assessmentTypes';

interface AssessmentAccessCardProps {
  assessment: Assessment;
  studentProfileId: number;
  onStartAssessment?: () => void;
  onViewResults?: () => void;
  onClick?: () => void;
  showRefreshButton?: boolean;
  className?: string;
}

export const AssessmentAccessCard: React.FC<AssessmentAccessCardProps> = ({
  assessment,
  studentProfileId,
  onStartAssessment,
  onViewResults,
  onClick,
  showRefreshButton = true,
  className = ''
}) => {
  const {
    accessData,
    canAccess,
    isLocked,
    isAlreadySubmitted,
    isExpired,
    isNotYetOpen,
    isLoading,
    refetch,
    isRefetching
  } = useAssessmentAccess(assessment.id, studentProfileId);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleStart = (e?: React.MouseEvent) => {
    console.log('🎯 handleStart called', { 
      canAccess, 
      isAlreadySubmitted, 
      hasCallback: !!onStartAssessment,
      assessmentId: assessment.id 
    });
    
    if (e) {
      e.stopPropagation();
    }
    
    // Always try onStartAssessment first if available
    if (onStartAssessment && canAccess && !isAlreadySubmitted) {
      console.log('✅ Calling onStartAssessment');
      onStartAssessment();
    } else {
      console.log('❌ Cannot start:', { canAccess, isAlreadySubmitted, hasCallback: !!onStartAssessment });
    }
  };

  const handleViewResults = (e?: React.MouseEvent) => {
    console.log('🎯 handleViewResults called', { 
      isAlreadySubmitted, 
      hasCallback: !!onViewResults 
    });
    
    if (e) {
      e.stopPropagation();
    }
    
    // Always try onViewResults first if available
    if (onViewResults && isAlreadySubmitted) {
      console.log('✅ Calling onViewResults');
      onViewResults();
    } else {
      console.log('❌ Cannot view results:', { isAlreadySubmitted, hasCallback: !!onViewResults });
    }
  };

  // ✅ FIX: Create a wrapper function that doesn't pass the event
  const handleRetry = () => {
    refetch();
  };

  return (
    <Card 
      className={`p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}
      onClick={onClick ? handleCardClick : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {assessment.title}
          </h3>
          <p className="text-sm text-gray-600">
            {assessment.subjectName} {assessment.lessonTopicTitle && `• ${assessment.lessonTopicTitle}`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <AssessmentStatusBadge accessData={accessData} />
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              disabled={isRefetching}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Access Status Alert - ✅ FIXED: No event parameter */}
      <AccessCheckAlert
        accessData={accessData}
        showCountdown={canAccess}
        showTimeWindow={true}
        onRetry={handleRetry}
        className="mb-4"
      />

      {/* Assessment Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <span className="text-gray-600">Questions:</span>
          <span className="ml-2 font-semibold text-gray-900">{assessment.questionCount}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600">Total Marks:</span>
          <span className="ml-2 font-semibold text-gray-900">{assessment.totalMarks}</span>
        </div>
        {assessment.durationMinutes && (
          <div className="text-sm">
            <span className="text-gray-600">Duration:</span>
            <span className="ml-2 font-semibold text-gray-900">{assessment.durationMinutes} mins</span>
          </div>
        )}
        <div className="text-sm">
          <span className="text-gray-600">Passing:</span>
          <span className="ml-2 font-semibold text-gray-900">{assessment.passingMarks} marks</span>
        </div>
      </div>

      {/* Countdown Timer (if available and accessible) */}
      {canAccess && accessData?.windowEnd && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CountdownTimer
            endTime={accessData.windowEnd}
            warningThreshold={10}
            showIcon={true}
            showLabel={true}
          />
        </div>
      )}

      {/* Grace Period Warning */}
      {accessData?.gracePeriodActive && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Grace Period Active!</strong> Submit your assessment before time runs out to avoid it being marked as incomplete.
          </div>
        </div>
      )}

      {/* ✅ NEW: Expired Warning */}
      {isExpired && !isAlreadySubmitted && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>Assessment Window Closed</strong>
            <p className="mt-1">This assessment is no longer available. The submission window has expired.</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Start Assessment Button */}
        {!isAlreadySubmitted && (
          <Button
            onClick={handleStart}
            disabled={!canAccess || isLoading}
            className={`flex-1 ${
              canAccess 
                ? 'bg-green-600 hover:bg-green-700' 
                : isExpired
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {/* ✅ UPDATED: Better button states */}
            {isExpired ? (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Expired
              </>
            ) : isNotYetOpen ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Locked
              </>
            ) : canAccess ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Start Assessment
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Not Available
              </>
            )}
          </Button>
        )}

        {/* View Results Button */}
        {isAlreadySubmitted && (
          <Button
            onClick={handleViewResults}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            View Results
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
          Checking access...
        </div>
      )}
    </Card>
  );
};

/**
 * Compact version for lists
 */
export const CompactAssessmentAccessCard: React.FC<{
  assessment: Assessment;
  studentProfileId: number;
  onClick?: () => void;
  className?: string;
}> = ({ assessment, studentProfileId, onClick, className = '' }) => {
  const { 
    accessData, 
    canAccess, 
    isAlreadySubmitted,
    isExpired,
    isNotYetOpen 
  } = useAssessmentAccess(assessment.id, studentProfileId);

  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{assessment.title}</h4>
          <p className="text-xs text-gray-600 mb-2">
            {assessment.subjectName} • {assessment.questionCount} questions
          </p>
          
          {/* ✅ UPDATED: Show status-specific info */}
          {isExpired && !isAlreadySubmitted && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <XCircle className="w-3 h-3" />
              <span>Expired</span>
            </div>
          )}
          
          {isNotYetOpen && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
              <Lock className="w-3 h-3" />
              <span>Opens soon</span>
            </div>
          )}
          
          {canAccess && accessData?.windowEnd && !isAlreadySubmitted && (
            <div className="mt-2">
              <CountdownTimer
                endTime={accessData.windowEnd}
                size="sm"
                showIcon={true}
                showLabel={false}
              />
            </div>
          )}
        </div>
        
        <AssessmentStatusBadge accessData={accessData} size="sm" />
      </div>
    </div>
  );
};

export default AssessmentAccessCard;