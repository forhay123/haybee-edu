// frontend/src/features/individual/components/student/AssessmentScoreDisplay.tsx

import { Award, Clock, CheckCircle2, XCircle, TrendingUp, AlertCircle } from "lucide-react";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { format } from "date-fns";

interface AssessmentScoreDisplayProps {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  graded: boolean;
  gradedAt?: string | null;
  submittedAt?: string;
  variant?: "compact" | "detailed";
}

export function AssessmentScoreDisplay({
  score,
  totalMarks,
  percentage,
  passed,
  graded,
  gradedAt,
  submittedAt,
  variant = "compact",
}: AssessmentScoreDisplayProps) {
  
  // Determine grade level and styling
  const getGradeInfo = () => {
    if (percentage >= 90) {
      return { 
        letter: "A", 
        label: "Excellent", 
        color: "text-green-700", 
        bgColor: "bg-green-100",
        borderColor: "border-green-300"
      };
    } else if (percentage >= 80) {
      return { 
        letter: "B", 
        label: "Very Good", 
        color: "text-blue-700", 
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300"
      };
    } else if (percentage >= 70) {
      return { 
        letter: "C", 
        label: "Good", 
        color: "text-yellow-700", 
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-300"
      };
    } else if (percentage >= 60) {
      return { 
        letter: "D", 
        label: "Fair", 
        color: "text-orange-700", 
        bgColor: "bg-orange-100",
        borderColor: "border-orange-300"
      };
    } else {
      return { 
        letter: "F", 
        label: "Needs Improvement", 
        color: "text-red-700", 
        bgColor: "bg-red-100",
        borderColor: "border-red-300"
      };
    }
  };

  const gradeInfo = getGradeInfo();

  if (variant === "compact") {
    return (
      <div className="bg-white border border-green-200 rounded-lg p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-gray-700">Score:</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">
                {score.toFixed(1)} / {totalMarks}
              </div>
              <div className="text-xs text-muted-foreground">
                {percentage.toFixed(1)}%
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                passed
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-red-100 text-red-700 border-red-300'
              }`}
            >
              {passed ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Passed
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </>
              )}
            </Badge>
          </div>
        </div>
        {!graded && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3 w-3" />
            <span>Pending grading</span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={`border rounded-lg p-4 ${gradeInfo.bgColor} ${gradeInfo.borderColor}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${gradeInfo.bgColor} border-2 ${gradeInfo.borderColor}`}>
            <Award className={`h-6 w-6 ${gradeInfo.color}`} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Assessment Results</h4>
            <p className="text-xs text-muted-foreground">
              {graded ? (
                gradedAt ? (
                  <>Graded on {format(new Date(gradedAt), "MMM d, yyyy 'at' h:mm a")}</>
                ) : (
                  <>Submitted {submittedAt ? `on ${format(new Date(submittedAt), "MMM d, yyyy")}` : ''}</>
                )
              ) : (
                <>Submitted {submittedAt ? `on ${format(new Date(submittedAt), "MMM d, yyyy")}` : ''}</>
              )}
            </p>
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-lg border-2 ${gradeInfo.borderColor} ${gradeInfo.bgColor}`}>
          <div className={`text-3xl font-bold ${gradeInfo.color} text-center`}>
            {gradeInfo.letter}
          </div>
          <div className="text-xs text-center text-muted-foreground mt-1">
            {gradeInfo.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">Your Score</p>
          <p className="text-lg font-bold text-gray-900">{score.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">Total Marks</p>
          <p className="text-lg font-bold text-gray-900">{totalMarks}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-muted-foreground mb-1">Percentage</p>
          <p className="text-lg font-bold text-gray-900">{percentage.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {passed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Passed</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Failed</span>
            </>
          )}
        </div>
        
        {!graded && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700">Pending grading</span>
          </div>
        )}
        
        {graded && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">Graded</span>
          </div>
        )}
      </div>

      {!graded && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Your teacher is reviewing your essay responses. The final score may change after grading is complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Performance indicator component
interface PerformanceIndicatorProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
}

export function PerformanceIndicator({ percentage, size = "md" }: PerformanceIndicatorProps) {
  const getColorClass = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <div className="flex items-center gap-1">
      <TrendingUp className={`${sizeClasses[size]} ${getColorClass()}`} />
      <span className={`font-semibold ${getColorClass()}`}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}