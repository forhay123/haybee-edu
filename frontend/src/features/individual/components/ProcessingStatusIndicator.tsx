// frontend/src/features/individual/components/ProcessingStatusIndicator.tsx

import React from "react";
import { ProcessingStatus } from "../types/individualTypes";
import { getStatusBadgeProps, formatProcessingTime } from "../hooks/useProcessingStatus";

interface ProcessingStatusIndicatorProps {
  status: ProcessingStatus;
  uploadedAt: string;
  processedAt?: string;
  error?: string;
  showTime?: boolean;
  className?: string;
}

/**
 * Status indicator with icon, color, and optional processing time
 */
export const ProcessingStatusIndicator: React.FC<ProcessingStatusIndicatorProps> = ({
  status,
  uploadedAt,
  processedAt,
  error,
  showTime = true,
  className = "",
}) => {
  const { color, text, icon, animate } = getStatusBadgeProps(status);

  const colorClasses = {
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    red: "bg-red-100 text-red-800 border-red-300",
    gray: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
          colorClasses[color as keyof typeof colorClasses]
        }`}
      >
        <span className={animate ? "animate-spin" : ""}>{icon}</span>
        <span>{text}</span>
      </div>

      {showTime && (
        <div className="text-xs text-gray-500">
          {status === "COMPLETED" && processedAt ? (
            <span>Processed in {formatProcessingTime(uploadedAt, processedAt)}</span>
          ) : status === "PROCESSING" || status === "PENDING" ? (
            <span className="animate-pulse">Processing...</span>
          ) : status === "FAILED" && error ? (
            <span className="text-red-600">{error}</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

/**
 * Compact status badge (just icon and text, no time)
 */
export const StatusBadge: React.FC<{ status: ProcessingStatus }> = ({ status }) => {
  const { color, text, icon, animate } = getStatusBadgeProps(status);

  const colorClasses = {
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      <span className={animate ? "animate-spin" : ""}>{icon}</span>
      <span>{text}</span>
    </span>
  );
};

/**
 * Processing progress card (shows details about extraction results)
 */
interface ProcessingResultsProps {
  totalPeriodsExtracted?: number;
  subjectsIdentified?: number;
  totalTopicsExtracted?: number;
  weeksCovered?: number;
  confidenceScore?: number;
}

export const ProcessingResults: React.FC<ProcessingResultsProps> = ({
  totalPeriodsExtracted,
  subjectsIdentified,
  totalTopicsExtracted,
  weeksCovered,
  confidenceScore,
}) => {
  const hasResults =
    totalPeriodsExtracted !== undefined ||
    subjectsIdentified !== undefined ||
    totalTopicsExtracted !== undefined ||
    weeksCovered !== undefined;

  if (!hasResults) return null;

  const getConfidenceColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Extraction Results</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {totalPeriodsExtracted !== undefined && (
          <div>
            <span className="text-gray-600">Periods:</span>
            <span className="ml-2 font-medium text-gray-900">{totalPeriodsExtracted}</span>
          </div>
        )}
        {subjectsIdentified !== undefined && (
          <div>
            <span className="text-gray-600">Subjects:</span>
            <span className="ml-2 font-medium text-gray-900">{subjectsIdentified}</span>
          </div>
        )}
        {totalTopicsExtracted !== undefined && (
          <div>
            <span className="text-gray-600">Topics:</span>
            <span className="ml-2 font-medium text-gray-900">{totalTopicsExtracted}</span>
          </div>
        )}
        {weeksCovered !== undefined && (
          <div>
            <span className="text-gray-600">Weeks:</span>
            <span className="ml-2 font-medium text-gray-900">{weeksCovered}</span>
          </div>
        )}
        {confidenceScore !== undefined && (
          <div className="col-span-2">
            <span className="text-gray-600">Confidence:</span>
            <span className={`ml-2 font-semibold ${getConfidenceColor(confidenceScore)}`}>
              {(confidenceScore * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Live processing indicator (shows in header/nav when items are processing)
 */
export const LiveProcessingIndicator: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
      <span className="animate-spin text-blue-600">🔄</span>
      <span className="text-sm font-medium text-blue-700">
        {count} {count === 1 ? "file" : "files"} processing
      </span>
    </div>
  );
};