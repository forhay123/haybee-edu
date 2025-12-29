// src/features/progress/components/WeeklyScheduleForm.tsx

import React, { useState, useEffect, useMemo } from "react";
import { 
  useTeacherClasses, 
  useTeacherSubjects, 
  useSubjectsByClass, 
  useLessonTopics, 
  useCreateWeeklySchedule 
} from "../hooks/useWeeklySchedules";
import { useScheduleValidation } from "../../assessments/hooks/useScheduleValidation";
import { Calendar, Clock, Award, AlertCircle, Users, BookOpen, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import ValidationErrorAlert from "./ValidationErrorAlert";
import ScheduleValidationChecklist from "./ScheduleValidationChecklist";

const PRIORITY_OPTIONS = [
  { value: 1, label: "Critical", color: "text-red-600", icon: "🔴" },
  { value: 2, label: "High", color: "text-orange-600", icon: "🟠" },
  { value: 3, label: "Medium", color: "text-yellow-600", icon: "🟡" },
  { value: 4, label: "Low", color: "text-green-600", icon: "🟢" },
];

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const WEIGHT_OPTIONS = [1, 1.5, 2, 2.5, 3];
const WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

interface WeeklyScheduleFormProps {
  onSuccess?: () => void;
}

export const WeeklyScheduleForm: React.FC<WeeklyScheduleFormProps> = ({ onSuccess }) => {
  const [classId, setClassId] = useState<number>(0);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [lessonTopicId, setLessonTopicId] = useState<number>(0);
  const [dayOfWeek, setDayOfWeek] = useState<string>("MONDAY");
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("09:00");
  const [priority, setPriority] = useState<number>(3);
  const [weight, setWeight] = useState<number>(1);
  const [showValidation, setShowValidation] = useState<boolean>(false);

  const createWeeklySchedule = useCreateWeeklySchedule();
  
  // ✅ These hooks now work for both admin and teacher (backend handles role check)
  const { data: classes, isLoading: loadingClasses, error: classesError } = useTeacherClasses();
  const { data: allTeacherSubjects, isLoading: loadingAllSubjects } = useTeacherSubjects();
  const { data: classSubjects, isLoading: loadingClassSubjects } = useSubjectsByClass(classId);
  const { data: lessonTopics, isLoading: loadingTopics } = useLessonTopics(subjectId);

  // Validation hook
  const { 
    validationResult, 
    isValidating, 
    validateSchedule 
  } = useScheduleValidation();

  // Filter subjects to show intersection of teacher's subjects and class subjects
  const subjects = useMemo(() => {
    if (!classId || !classSubjects || !allTeacherSubjects) return [];
    
    const teacherSubjectIds = new Set(allTeacherSubjects.map(s => s.id));
    
    return classSubjects.filter(subject => teacherSubjectIds.has(subject.id));
  }, [classId, classSubjects, allTeacherSubjects]);

  const loadingSubjects = loadingAllSubjects || loadingClassSubjects;

  // Reset subject and topic when class changes
  useEffect(() => {
    setSubjectId(0);
    setLessonTopicId(0);
    setShowValidation(false);
  }, [classId]);

  // Reset topic when subject changes
  useEffect(() => {
    setLessonTopicId(0);
    setShowValidation(false);
  }, [subjectId]);

  // Auto-validate when lesson topic changes
  useEffect(() => {
    if (lessonTopicId > 0 && subjectId > 0 && classId > 0) {
      validateSchedule({
        classId,
        subjectId,
        lessonTopicId,
        weekNumber,
        dayOfWeek,
        periodNumber
      });
      setShowValidation(true);
    } else {
      setShowValidation(false);
    }
  }, [lessonTopicId, subjectId, classId, weekNumber, dayOfWeek, periodNumber, validateSchedule]);

  // Filter lesson topics by week number
  const filteredLessonTopics = useMemo(() => {
    if (!lessonTopics) return [];
    
    return lessonTopics.filter(topic => {
      return !topic.weekNumber || topic.weekNumber === weekNumber;
    });
  }, [lessonTopics, weekNumber]);

  const handleValidate = () => {
    if (!classId || !subjectId) {
      toast.error("Please select both a class and subject first.");
      return;
    }

    validateSchedule({
      classId,
      subjectId,
      lessonTopicId: lessonTopicId > 0 ? lessonTopicId : undefined,
      weekNumber,
      dayOfWeek,
      periodNumber
    });
    setShowValidation(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classId || !subjectId) {
      toast.error("Please select both a class and subject.");
      return;
    }

    // Check validation before submitting
    if (validationResult && !validationResult.canCreate) {
      toast.error("Please fix validation errors before creating the schedule.");
      return;
    }

    createWeeklySchedule.mutate(
      {
        classId,
        subjectId,
        lessonTopicId: lessonTopicId > 0 ? lessonTopicId : undefined,
        dayOfWeek,
        periodNumber,
        weekNumber,
        startTime,
        endTime,
        priority,
        weight,
      },
      {
        onSuccess: () => {
          toast.success("Weekly schedule created! Daily schedules auto-generated for all students. 🎉");
          // Reset form
          setClassId(0);
          setSubjectId(0);
          setLessonTopicId(0);
          setDayOfWeek("MONDAY");
          setPeriodNumber(1);
          setWeekNumber(1);
          setStartTime("08:00");
          setEndTime("09:00");
          setPriority(3);
          setWeight(1);
          setShowValidation(false);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to create weekly schedule");
        },
      }
    );
  };

  // Show error if classes failed to load
  if (classesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Failed to Load Classes</h3>
            <p className="text-sm text-red-700 mt-1">
              {(classesError as any)?.response?.data?.message || 
               "Unable to load classes. Please try refreshing the page."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Create Weekly Schedule</h2>
        <p className="text-sm text-gray-600 mt-1">
          Define a weekly schedule template. Daily schedules will be auto-generated for all students in the selected class.
        </p>
      </div>

      {/* Validation Results */}
      {showValidation && validationResult && !validationResult.canCreate && (
        <ValidationErrorAlert
          validationResult={validationResult}
          onDismiss={() => setShowValidation(false)}
        />
      )}

      {showValidation && validationResult && validationResult.canCreate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Schedule Validated Successfully</p>
            <p className="text-xs text-green-700 mt-1">
              All requirements met. This schedule is ready to be created.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users size={16} />
            Class *
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loadingClasses}
          >
            <option value={0}>
              {loadingClasses ? "Loading classes..." : "Select a class"}
            </option>
            {classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          {!loadingClasses && classes?.length === 0 && (
            <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle size={16} />
              No classes available. Contact an administrator if this seems incorrect.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={!classId || loadingSubjects}
          >
            <option value={0}>
              {!classId ? "Select a class first" : loadingSubjects ? "Loading subjects..." : "Select a subject"}
            </option>
            {subjects?.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {classId > 0 && subjects?.length === 0 && !loadingSubjects && (
            <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle size={16} />
              No subjects available for this class. You may not be assigned to teach subjects in this class.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={16} />
            Week Number *
          </label>
          <select
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {WEEK_OPTIONS.map((week) => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select the week in the term curriculum this schedule applies to.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <BookOpen size={16} />
            Lesson Topic for Week {weekNumber} (Optional)
          </label>
          <select
            value={lessonTopicId}
            onChange={(e) => setLessonTopicId(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!subjectId || loadingTopics}
          >
            <option value={0}>
              {!subjectId ? "Select a subject first" : "None / To be determined"}
            </option>
            {filteredLessonTopics?.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title || topic.topicTitle}
                {topic.weekNumber ? ` (Week ${topic.weekNumber})` : " (All weeks)"}
              </option>
            ))}
          </select>
          {subjectId > 0 && filteredLessonTopics?.length === 0 && !loadingTopics && (
            <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle size={16} />
              No lessons/topics found for week {weekNumber}
            </p>
          )}
          {subjectId > 0 && lessonTopics && lessonTopics.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              ℹ️ Showing {filteredLessonTopics?.length} of {lessonTopics.length} available topics for week {weekNumber}
            </p>
          )}
        </div>

        {/* Validate Button */}
        {lessonTopicId > 0 && (
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || !classId || !subjectId}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Validating...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Validate Schedule</span>
              </>
            )}
          </button>
        )}

        {/* Validation Checklist */}
        {showValidation && validationResult && (
          <ScheduleValidationChecklist
            validationResult={validationResult}
            isValidating={isValidating}
          />
        )}

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-800 mb-4">Schedule Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Day of Week *
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock size={16} />
                Period *
              </label>
              <select
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {PERIOD_OPTIONS.map((period) => (
                  <option key={period} value={period}>
                    Period {period}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={priority === option.value}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-4 h-4"
                  />
                  <span className="text-lg">{option.icon}</span>
                  <span className={`font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Award size={16} />
              Weight Multiplier
            </label>
            <select
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {WEIGHT_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}x {w > 1 ? `(${w}x importance)` : "(standard)"}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Higher weight = more impact on progress calculations
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Schedule Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Admins can create schedules for any class and subject</li>
                <li>Teachers can only create schedules for classes and subjects they teach</li>
                <li>Select the week in the academic calendar this schedule applies to</li>
                <li>Lesson topics can be linked to specific weeks for curriculum planning</li>
                <li>Validation checks ensure assessments are properly configured</li>
                <li>Daily schedules will be auto-generated for all students in the class</li>
                <li>Term dates are configured by administrators for consistency across all schedules</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={
              createWeeklySchedule.isPending || 
              !classId || 
              !subjectId ||
              (validationResult && !validationResult.canCreate)
            }
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium 
              hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed 
              transition-colors flex items-center justify-center gap-2"
          >
            {createWeeklySchedule.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Schedule...</span>
              </>
            ) : (
              <>
                <Calendar size={20} />
                <span>Create Weekly Schedule (Week {weekNumber}) & Generate Daily Schedules</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};