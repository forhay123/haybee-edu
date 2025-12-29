import React, { useState, useEffect } from "react";
import { useSubjects, useLessonTopics, useCreateSchedule } from "../hooks/useSchedules";
import { useAuth } from "@/features/auth/useAuth";
import { Calendar, Clock, Award, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast"; // ✅ use your existing toast setup

const PRIORITY_OPTIONS = [
  { value: 1, label: "Critical", color: "text-red-600", icon: "🔴" },
  { value: 2, label: "High", color: "text-orange-600", icon: "🟠" },
  { value: 3, label: "Medium", color: "text-yellow-600", icon: "🟡" },
  { value: 4, label: "Low", color: "text-green-600", icon: "🟢" },
];

const PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const WEIGHT_OPTIONS = [1, 1.5, 2, 2.5, 3];

interface ScheduleLessonFormProps {
  onSuccess?: () => void;
}

export const ScheduleLessonForm: React.FC<ScheduleLessonFormProps> = ({ onSuccess }) => {
  const [subjectId, setSubjectId] = useState<number>(0);
  const [lessonTopicId, setLessonTopicId] = useState<number>(0);
  const [scheduledDate, setScheduledDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [priority, setPriority] = useState<number>(3);
  const [weight, setWeight] = useState<number>(1);

  const { user } = useAuth();
  const createSchedule = useCreateSchedule();
  const { data: subjects, isLoading: loadingSubjects } = useSubjects();
  const { data: lessonTopics, isLoading: loadingTopics } = useLessonTopics(subjectId);

  useEffect(() => {
    setLessonTopicId(0);
  }, [subjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !lessonTopicId) {
      toast.error("Please select both a subject and lesson topic.");
      return;
    }

    if (!user?.studentProfileId && !user?.id) {
      toast.error("Student profile missing. Please re-login or contact admin.");
      return;
    }

    const studentId = user.studentProfileId || user.id;

    createSchedule.mutate(
      {
        studentId,
        subjectId,
        lessonTopicId,
        scheduledDate,
        periodNumber,
        priority,
        weight,
      },
      {
        onSuccess: () => {
          toast.success("Lesson scheduled successfully!");
          // reset form
          setSubjectId(0);
          setLessonTopicId(0);
          setScheduledDate(format(new Date(), "yyyy-MM-dd"));
          setPeriodNumber(1);
          setPriority(3);
          setWeight(1);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to schedule lesson");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Schedule a Lesson</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add a lesson to the daily schedule for students
        </p>
      </div>

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject *
        </label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(Number(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={loadingSubjects}
        >
          <option value={0}>Select a subject</option>
          {subjects?.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lesson Topic Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lesson / Topic *
        </label>
        <select
          value={lessonTopicId}
          onChange={(e) => setLessonTopicId(Number(e.target.value))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={!subjectId || loadingTopics}
        >
          <option value={0}>
            {!subjectId ? "Select a subject first" : "Select a lesson/topic"}
          </option>
          {lessonTopics?.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title || topic.topicTitle}{" "}
              {topic.weekNumber ? `(Week ${topic.weekNumber})` : ""}
            </option>
          ))}
        </select>
        {subjectId > 0 && lessonTopics?.length === 0 && !loadingTopics && (
          <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle size={16} />
            No lessons/topics found for this subject
          </p>
        )}
      </div>

      {/* Date + Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={16} />
            Scheduled Date *
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
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

      {/* Priority + Weight */}
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

      {/* Submit */}
      <div className="pt-4 border-t">
        <button
          type="submit"
          disabled={createSchedule.isPending || !subjectId || !lessonTopicId}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium 
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed 
            transition-colors flex items-center justify-center gap-2"
        >
          {createSchedule.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Scheduling...</span>
            </>
          ) : (
            <>
              <Calendar size={20} />
              <span>Schedule Lesson</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
