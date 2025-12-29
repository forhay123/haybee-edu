// frontend/src/features/individual/components/admin/SystemStatsCards.tsx

import React from "react";
import {
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { TimetableSystemStatsDto } from "../../types/individualTypes";

interface SystemStatsCardsProps {
  stats?: TimetableSystemStatsDto; // ✅ Make optional
  isLoading?: boolean;
  // ✅ Pass computed values from parent
  processingCount: number;
  failedCount: number;
  completedCount: number;
  totalCount: number;
}

const SystemStatsCards: React.FC<SystemStatsCardsProps> = ({ 
  stats, 
  isLoading,
  processingCount,
  failedCount,
  completedCount,
  totalCount,
}) => {
  // ✅ Calculate unique students from stats or use fallback
  const totalStudents = stats?.totalStudents ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const avgConfidenceScore = stats?.avgConfidenceScore;

  const cards = [
    {
      title: "Total Timetables",
      value: totalCount,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      title: "Individual Students",
      value: totalStudents,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      borderColor: "border-purple-200",
    },
    {
      title: "Completed",
      value: completedCount,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      borderColor: "border-green-200",
      subtitle: totalCount > 0 
        ? `${((completedCount / totalCount) * 100).toFixed(0)}% success rate`
        : "0% success rate",
    },
    {
      title: "Processing",
      value: processingCount,
      icon: RefreshCw,
      color: "bg-indigo-50 text-indigo-600",
      borderColor: "border-indigo-200",
      animate: processingCount > 0,
    },
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      borderColor: "border-yellow-200",
    },
    {
      title: "Failed",
      value: failedCount,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      borderColor: "border-red-200",
      subtitle: failedCount > 0 ? "Needs attention" : "All good!",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`bg-white rounded-lg shadow border ${card.borderColor} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon
                  className={`w-5 h-5 ${card.animate ? "animate-spin" : ""}`}
                />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  card.value
                )}
              </p>
              <p className="text-xs text-gray-600 mt-1">{card.title}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Additional Stats Cards */}
      {avgConfidenceScore !== undefined && avgConfidenceScore !== null && (
        <div className="bg-white rounded-lg shadow border border-teal-200 p-4 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
              ) : (
                `${(avgConfidenceScore * 100).toFixed(0)}%`
              )}
            </p>
            <p className="text-xs text-gray-600 mt-1">Avg. Confidence</p>
            <p className="text-xs text-gray-500 mt-1">AI extraction accuracy</p>
          </div>
        </div>
      )}

      {failedCount > 0 && (
        <div className="bg-red-50 rounded-lg shadow border border-red-200 p-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Action Required</p>
              <p className="text-xs text-red-700 mt-1">
                {failedCount} {failedCount === 1 ? "timetable" : "timetables"} failed processing. Review and reprocess.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatsCards;