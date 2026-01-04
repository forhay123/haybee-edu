// src/features/assessments/components/WorkingsDisplay.tsx
// ✅ Reusable component for displaying step-by-step workings

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';

interface WorkingsDisplayProps {
  workings: string;
  isExpanded?: boolean;
  className?: string;
}

export const WorkingsDisplay: React.FC<WorkingsDisplayProps> = ({
  workings,
  isExpanded = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(isExpanded);

  if (!workings || workings.trim() === '') {
    return null;
  }

  // Split workings into lines and format
  const lines = workings.split('\n').filter(line => line.trim() !== '');

  return (
    <div className={`mt-4 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-lg transition-all w-full text-left font-medium text-indigo-900"
      >
        <Calculator className="w-5 h-5 text-indigo-600" />
        <span>{expanded ? 'Hide' : 'Show'} Step-by-Step Workings</span>
        {expanded ? (
          <ChevronUp className="w-5 h-5 ml-auto text-indigo-600" />
        ) : (
          <ChevronDown className="w-5 h-5 ml-auto text-indigo-600" />
        )}
      </button>

      {/* Workings Content */}
      {expanded && (
        <div className="mt-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-indigo-200">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-indigo-900">Solution Steps:</h4>
          </div>
          
          <div className="space-y-3">
            {lines.map((line, index) => {
              // Check if line is a step header
              const isStepHeader = /^Step \d+:/i.test(line.trim());
              
              return (
                <div
                  key={index}
                  className={`${
                    isStepHeader
                      ? 'font-semibold text-indigo-900 text-base mt-4 first:mt-0'
                      : 'text-gray-800 pl-4 leading-relaxed'
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t-2 border-indigo-200">
            <p className="text-xs text-indigo-700 italic flex items-center gap-1">
              <span>💡</span>
              <span>Follow these steps to understand how the answer was derived</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingsDisplay;