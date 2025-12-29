// frontend/src/features/progress/components/IncompleteLessonsFilter.tsx

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { Separator } from '@/components/ui/separator';
import { Filter } from 'lucide-react';
import { IncompleteLessonReason } from '../types/types';

interface IncompleteLessonsFilterProps {
  selectedReason: IncompleteLessonReason | 'all';
  selectedSubject: string | 'all';
  subjects: string[];
  onReasonChange: (reason: IncompleteLessonReason | 'all') => void;
  onSubjectChange: (subject: string | 'all') => void;
  counts: {
    all: number;
    not_attempted: number;
    incomplete_assessment: number;
    not_passed: number;
  };
}

const IncompleteLessonsFilter: React.FC<IncompleteLessonsFilterProps> = ({
  selectedReason,
  selectedSubject,
  subjects,
  onReasonChange,
  onSubjectChange,
  counts,
}) => {
  const reasonOptions: Array<{ value: IncompleteLessonReason | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'All Reasons', count: counts.all },
    { value: IncompleteLessonReason.NOT_ATTEMPTED, label: 'Not Attempted', count: counts.not_attempted },
    { value: IncompleteLessonReason.INCOMPLETE_ASSESSMENT, label: 'Incomplete Assessment', count: counts.incomplete_assessment },
    { value: IncompleteLessonReason.NOT_PASSED, label: 'Not Passed', count: counts.not_passed },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <CardTitle>Filters</CardTitle>
        </div>
        <CardDescription>
          Filter incomplete lessons by reason or subject
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter by Reason */}
        <div className="space-y-3">
          <div className="text-sm font-medium">By Reason</div>
          <div className="flex flex-wrap gap-2">
            {reasonOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedReason === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onReasonChange(option.value)}
                className="flex items-center gap-2"
              >
                {option.label}
                <Badge 
                  variant={selectedReason === option.value ? 'secondary' : 'outline'}
                  className="ml-1"
                >
                  {option.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Filter by Subject */}
        <div className="space-y-3">
          <div className="text-sm font-medium">By Subject</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSubject === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSubjectChange('all')}
            >
              All Subjects
            </Button>
            {subjects.map((subject) => (
              <Button
                key={subject}
                variant={selectedSubject === subject ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSubjectChange(subject)}
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {(selectedReason !== 'all' || selectedSubject !== 'all') && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Active filters:
                {selectedReason !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {reasonOptions.find(o => o.value === selectedReason)?.label}
                  </Badge>
                )}
                {selectedSubject !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedSubject}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onReasonChange('all');
                  onSubjectChange('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default IncompleteLessonsFilter;