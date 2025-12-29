// frontend/src/features/individual/components/teacher/WeekNavigator.tsx

import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface WeekNavigatorProps {
  weeksWithCounts: Record<number, number>;
  selectedWeek: number | null;
  onWeekSelect: (weekNumber: number | null) => void;
}

export function WeekNavigator({
  weeksWithCounts,
  selectedWeek,
  onWeekSelect,
}: WeekNavigatorProps) {
  const weeks = Object.keys(weeksWithCounts)
    .map(Number)
    .sort((a, b) => a - b);

  const currentWeekNumber = getCurrentWeekNumber();
  const visibleWeeks = getVisibleWeeks(weeks, selectedWeek || currentWeekNumber);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Week Navigator</h3>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWeekSelect(null)}
          disabled={selectedWeek === null}
        >
          Show All Weeks
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Weeks Button */}
        <Button
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => {
            const prevWeek = Math.max(...visibleWeeks) - 1;
            if (prevWeek >= weeks[0]) {
              onWeekSelect(prevWeek);
            }
          }}
          disabled={visibleWeeks[0] <= weeks[0]}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Week Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto flex-1">
          {visibleWeeks.map((weekNumber) => {
            const count = weeksWithCounts[weekNumber] || 0;
            const isCurrentWeek = weekNumber === currentWeekNumber;
            const isSelected = weekNumber === selectedWeek;

            return (
              <button
                key={weekNumber}
                onClick={() => onWeekSelect(weekNumber)}
                className={`
                  relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 transition-all min-w-[80px]
                  ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : isCurrentWeek
                      ? "border-green-300 bg-green-50 text-green-900"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <span className="text-xs font-medium text-gray-600">
                  Week {weekNumber}
                </span>
                <div className="flex items-center gap-1">
                  {count > 0 && (
                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {count}
                    </Badge>
                  )}
                  {isCurrentWeek && !isSelected && (
                    <span className="text-[10px] font-medium text-green-600">
                      Current
                    </span>
                  )}
                </div>

                {isCurrentWeek && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Next Weeks Button */}
        <Button
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => {
            const nextWeek = Math.max(...visibleWeeks) + 1;
            if (nextWeek <= weeks[weeks.length - 1]) {
              onWeekSelect(nextWeek);
            }
          }}
          disabled={visibleWeeks[visibleWeeks.length - 1] >= weeks[weeks.length - 1]}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 border-2 border-green-300 rounded" />
          <span>Current Week</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-50 border-2 border-blue-600 rounded" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

function getVisibleWeeks(allWeeks: number[], focusWeek: number): number[] {
  const maxVisible = 6;
  const focusIndex = allWeeks.indexOf(focusWeek);

  if (focusIndex === -1) {
    return allWeeks.slice(0, maxVisible);
  }

  const start = Math.max(0, focusIndex - Math.floor(maxVisible / 2));
  const end = Math.min(allWeeks.length, start + maxVisible);

  return allWeeks.slice(start, end);
}