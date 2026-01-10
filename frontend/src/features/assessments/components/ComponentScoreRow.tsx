// src/features/assessments/components/ComponentScoreRow.tsx

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ComponentScoreDto } from '../types/gradebookTypes';
import { AssessmentType } from '../types/assessmentTypes';
import { CheckCircle, Clock, XCircle, FileQuestion } from 'lucide-react';

interface ComponentScoreRowProps {
  component: ComponentScoreDto;
}

/**
 * 📝 Component Score Row
 * Displays score for a single assessment component (Quiz, Exam, etc.)
 */
export const ComponentScoreRow: React.FC<ComponentScoreRowProps> = ({ component }) => {
  // Get component type display name
  const getTypeLabel = (type: AssessmentType): string => {
    const labels: Record<AssessmentType, string> = {
      [AssessmentType.QUIZ]: 'Quiz',
      [AssessmentType.CLASSWORK]: 'Classwork',
      [AssessmentType.TEST1]: 'Test 1',
      [AssessmentType.TEST2]: 'Test 2',
      [AssessmentType.ASSIGNMENT]: 'Assignment',
      [AssessmentType.EXAM]: 'Exam',
      [AssessmentType.LESSON_TOPIC_ASSESSMENT]: 'Lesson Assessment',
    };
    return labels[type] || type;
  };

  // Get status icon and badge
  const getStatusDisplay = () => {
    if (!component.submitted) {
      if (component.count === 0) {
        return {
          icon: <FileQuestion className="h-4 w-4 text-gray-400" />,
          badge: <Badge variant="outline" className="bg-gray-50 text-gray-600">Not Available</Badge>,
          color: 'text-gray-500'
        };
      }
      return {
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        badge: <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>,
        color: 'text-yellow-600'
      };
    }
    
    if (component.percentage < 50) {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        badge: <Badge variant="outline" className="bg-red-50 text-red-700">Low Score</Badge>,
        color: 'text-red-600'
      };
    }
    
    return {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      badge: <Badge variant="outline" className="bg-green-50 text-green-700">Submitted</Badge>,
      color: 'text-green-600'
    };
  };

  const status = getStatusDisplay();
  const percentage = component.submitted ? component.percentage : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0">
        {status.icon}
      </div>

      {/* Component Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{getTypeLabel(component.type)}</span>
          <span className="text-xs text-muted-foreground">({component.weight}%)</span>
          {component.count > 1 && (
            <Badge variant="secondary" className="text-xs">
              {component.count} assessments
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {component.submitted && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full transition-all ${
                percentage >= 70
                  ? 'bg-green-500'
                  : percentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className="flex-shrink-0 text-right">
        {component.submitted ? (
          <>
            <div className="text-sm font-semibold">
              {component.score.toFixed(1)}/{component.totalPossible.toFixed(1)}
            </div>
            <div className={`text-xs ${status.color}`}>
              {percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              +{component.weightedScore.toFixed(1)} pts
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {component.count === 0 ? 'N/A' : 'Not submitted'}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        {status.badge}
      </div>
    </div>
  );
};