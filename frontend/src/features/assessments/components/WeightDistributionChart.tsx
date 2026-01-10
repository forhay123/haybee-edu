// src/features/assessments/components/WeightDistributionChart.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssessmentType } from '../types/gradebookTypes';

interface WeightDistributionChartProps {
  weights?: Record<AssessmentType, number>;
}

/**
 * 📊 Weight Distribution Chart
 * Visual pie chart showing assessment weight percentages
 */
export const WeightDistributionChart: React.FC<WeightDistributionChartProps> = ({
  weights,
}) => {
  // Default weights if not provided
  const defaultWeights = {
    [AssessmentType.QUIZ]: 20,
    [AssessmentType.CLASSWORK]: 10,
    [AssessmentType.TEST1]: 10,
    [AssessmentType.TEST2]: 10,
    [AssessmentType.ASSIGNMENT]: 10,
    [AssessmentType.EXAM]: 40,
  };

  const displayWeights = weights || defaultWeights;

  // Color mapping
  const colors: Record<AssessmentType, string> = {
    [AssessmentType.QUIZ]: '#3b82f6',
    [AssessmentType.CLASSWORK]: '#10b981',
    [AssessmentType.TEST1]: '#f59e0b',
    [AssessmentType.TEST2]: '#ef4444',
    [AssessmentType.ASSIGNMENT]: '#8b5cf6',
    [AssessmentType.EXAM]: '#ec4899',
  };

  // Labels
  const labels: Record<AssessmentType, string> = {
    [AssessmentType.QUIZ]: 'Quiz',
    [AssessmentType.CLASSWORK]: 'Classwork',
    [AssessmentType.TEST1]: 'Test 1',
    [AssessmentType.TEST2]: 'Test 2',
    [AssessmentType.ASSIGNMENT]: 'Assignment',
    [AssessmentType.EXAM]: 'Exam',
  };

  // Calculate SVG pie chart segments
  const createPieSegments = () => {
    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return Object.entries(displayWeights).map(([type, weight]) => {
      const angle = (weight / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle += angle;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate arc path
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      return {
        type: type as AssessmentType,
        weight,
        pathData,
        color: colors[type as AssessmentType],
      };
    });
  };

  const segments = createPieSegments();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Assessment Weight Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Pie Chart */}
          <svg width="200" height="200" viewBox="0 0 200 200" className="flex-shrink-0">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.pathData}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </svg>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="text-sm">
                  <div className="font-medium">{labels[segment.type]}</div>
                  <div className="text-xs text-muted-foreground">
                    {segment.weight}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};