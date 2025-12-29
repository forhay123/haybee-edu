// ============================================================================
// FILE 2: frontend/src/features/individual/components/IndividualSchedule.tsx
// ============================================================================

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, Circle } from "lucide-react";
import { scheduleApi } from "../api/individualApi";
import { INDIVIDUAL_TIME_WINDOWS } from "../types/individualTypes";

interface IndividualScheduleProps {
  studentProfileId: number;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const IndividualSchedule: React.FC<IndividualScheduleProps> = ({ studentProfileId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["individual-schedule", studentProfileId, formatDate(selectedDate)],
    queryFn: () => scheduleApi.getByDate(studentProfileId, formatDate(selectedDate)),
  });

  const dayOfWeek = getDayName(selectedDate).toUpperCase();
  const learningWindow = INDIVIDUAL_TIME_WINDOWS.find(w => w.dayOfWeek === dayOfWeek);

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-sm text-gray-600 mt-1">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
            >
              Today
            </button>
          )}
          
          <button
            onClick={goToNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {learningWindow ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-indigo-900">Learning Hours</span>
          </div>
          <p className="text-indigo-700">
            {learningWindow.startTime} - {learningWindow.endTime}
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌴</span>
            <div>
              <p className="font-semibold text-green-900">Rest Day</p>
              <p className="text-sm text-green-700">Take a break and recharge!</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading schedule...</div>
        </div>
      ) : !schedules || schedules.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">No lessons scheduled</p>
          <p className="text-sm text-gray-500">
            {learningWindow 
              ? "Upload your timetable and schemes to see your personalized schedule"
              : "This is your rest day - enjoy!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules
            .sort((a, b) => {
              const timeA = a.startTime || "";
              const timeB = b.startTime || "";
              return timeA.localeCompare(timeB);
            })
            .map((schedule) => (
              <div
                key={schedule.id}
                className={`bg-white border rounded-lg p-4 transition-all ${
                  schedule.completed
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg">
                      <p className="text-sm font-semibold">
                        {schedule.startTime || "TBD"}
                      </p>
                      {schedule.endTime && (
                        <p className="text-xs">to {schedule.endTime}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {schedule.subjectName}
                        </h3>
                        {schedule.lessonTopicTitle && (
                          <p className="text-sm text-gray-600 mt-1">
                            {schedule.lessonTopicTitle}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Period {schedule.periodNumber}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        {schedule.completed ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Week View</h3>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const date = new Date(selectedDate);
            const currentDayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
            const dayIndex = DAYS_OF_WEEK.indexOf(day);
            const dayDiff = dayIndex - currentDayIndex;
            date.setDate(date.getDate() + dayDiff);
            
            const isCurrentDay = formatDate(date) === formatDate(selectedDate);
            const hasLearningHours = INDIVIDUAL_TIME_WINDOWS.some(
              w => w.dayOfWeek === day.toUpperCase()
            );
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(date))}
                className={`p-2 rounded-lg text-center transition-all ${
                  isCurrentDay
                    ? "bg-indigo-600 text-white"
                    : hasLearningHours
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    : "bg-green-50 text-green-700"
                }`}
              >
                <p className="text-xs font-medium mb-1">{day.slice(0, 3)}</p>
                <p className="text-lg font-bold">{date.getDate()}</p>
                {!hasLearningHours && (
                  <p className="text-xs mt-1">🌴</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IndividualSchedule;