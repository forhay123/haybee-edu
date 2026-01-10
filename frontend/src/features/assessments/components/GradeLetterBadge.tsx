// src/features/assessments/components/GradeLetterBadge.tsx

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GradeLetter } from '../types/gradebookTypes';

interface GradeLetterBadgeProps {
  grade: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 🎓 Grade Letter Badge
 * Displays grade letter with color coding
 */
export const GradeLetterBadge: React.FC<GradeLetterBadgeProps> = ({
  grade,
  size = 'medium',
}) => {
  // Get color based on grade
  const getGradeColor = (grade: string): string => {
    const upperGrade = grade.toUpperCase();
    
    if (upperGrade.startsWith('A')) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (upperGrade.startsWith('B')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (upperGrade.startsWith('C')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    if (upperGrade.startsWith('D')) {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    }
    if (upperGrade === 'F') {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Get size classes
  const getSizeClasses = (): string => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-0.5';
      case 'large':
        return 'text-xl px-4 py-2 font-bold';
      case 'medium':
      default:
        return 'text-sm px-3 py-1 font-semibold';
    }
  };

  return (
    <Badge
      variant="outline"
      className={`${getGradeColor(grade)} ${getSizeClasses()} border-2`}
    >
      {grade}
    </Badge>
  );
};