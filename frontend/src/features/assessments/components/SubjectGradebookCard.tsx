// src/features/assessments/components/SubjectGradebookCard.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubjectGradebookDto } from '../types/gradebookTypes';
import { AssessmentType } from '../types/assessmentTypes';
import { ComponentScoreRow } from './ComponentScoreRow';
import { GradeLetterBadge } from './GradeLetterBadge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface SubjectGradebookCardProps {
  subject: SubjectGradebookDto;
  onViewDetails?: (subjectId: number) => void;
}

/**
 * 📚 Subject Gradebook Card
 * Shows weighted grade breakdown for a single subject
 */
export const SubjectGradebookCard: React.FC<SubjectGradebookCardProps> = ({
  subject,
  onViewDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Define the order of components to display
  const componentOrder: AssessmentType[] = [
    AssessmentType.QUIZ,
    AssessmentType.CLASSWORK,
    AssessmentType.TEST1,
    AssessmentType.TEST2,
    AssessmentType.ASSIGNMENT,
    AssessmentType.EXAM,
  ];

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAIL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'INCOMPLETE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-semibold">
                {subject.subjectName}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {subject.subjectCode}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <GradeLetterBadge grade={subject.gradeLetter} size="medium" />
              <Badge className={getStatusColor(subject.status)}>
                {subject.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {subject.componentsSubmitted}/{subject.totalComponents} components completed
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {subject.finalPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {subject.totalWeightedScore.toFixed(1)}/{subject.totalWeightCovered}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                subject.finalPercentage >= 70
                  ? 'bg-green-500'
                  : subject.finalPercentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(subject.finalPercentage, 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Component Breakdown */}
        {isExpanded && (
          <div className="space-y-2 mb-4">
            {componentOrder.map((type) => {
              const component = subject.components[type];
              if (!component) return null;
              return <ComponentScoreRow key={type} component={component} />;
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show Details <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(subject.subjectId)}
              className="gap-2"
            >
              View Full Report <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};