// frontend/src/features/individual/components/TimetableEntriesDisplay.tsx

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Info
} from "lucide-react";
import axios from "../../../api/axios";

interface TimetableEntry {
  dayOfWeek: string;
  periodNumber: number;
  startTime: string | null;
  endTime: string | null;
  subjectName: string;
  subjectId: number | null;
  subjectCode?: string | null;
  mappingConfidence: number | null;
  room: string | null;
  teacher: string | null;
}

interface TimetableEntriesDisplayProps {
  timetableId: number;
}

const TimetableEntriesDisplay: React.FC<TimetableEntriesDisplayProps> = ({
  timetableId,
}) => {
  const {
    data: entries = [],
    isLoading,
    error,
  } = useQuery<TimetableEntry[]>({
    queryKey: ["timetable-entries", timetableId],
    queryFn: async () => {
      try {
        // ✅ FIXED: Use axios with correct endpoint
        const response = await axios.get(`/individual/timetables/${timetableId}/entries`);
        return response.data;
      } catch (err: any) {
        console.error("Failed to fetch timetable entries:", err);
        
        // Better error messages
        if (err.response?.status === 404) {
          throw new Error("Timetable entries not found. The timetable may not have been processed yet.");
        }
        
        if (err.response?.status === 500) {
          throw new Error("Server error occurred. Please try again later.");
        }
        
        throw new Error(err.response?.data?.message || err.message || "Failed to load timetable entries");
      }
    },
    enabled: !!timetableId,
    retry: 1,
  });

  const formatTime = (time?: string | null) => {
    if (!time) return "?";
    try {
      const [hours, minutes] = time.split(":");
      let hour = parseInt(hours);
      const period = hour >= 12 ? "PM" : "AM";
      const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${display}:${minutes} ${period}`;
    } catch {
      return time;
    }
  };

  const confidenceBadge = (conf?: number | null) => {
    if (!conf && conf !== 0) return "bg-gray-100 text-gray-700";
    if (conf >= 0.9) return "bg-green-100 text-green-700";
    if (conf >= 0.7) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-300 bg-red-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load timetable</p>
            <p className="text-xs text-red-600 mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center bg-gray-50 rounded-lg p-10 border border-gray-200">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-700">No timetable entries found</p>
        <p className="text-xs text-gray-500 mt-1">Upload and process a timetable image</p>
      </div>
    );
  }

  const orderedDays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];

  const grouped = entries.reduce((acc, item) => {
    const key = item.dayOfWeek.toUpperCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  for (const day in grouped) {
    grouped[day].sort((a, b) => a.periodNumber - b.periodNumber);
  }

  const total = entries.length;
  const mapped = entries.filter((e) => e.subjectId).length;
  const uniqueSubjects = new Set(entries.map((e) => e.subjectName)).size;

  return (
    <div className="space-y-6">
      {/* ✅ LEARNING HOURS BANNER */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Clock className="w-6 h-6 text-indigo-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-900 mb-2">Your Learning Hours</h3>
            <p className="text-sm text-indigo-700 mb-3">
              This timetable shows all your classes. Your personalized schedule matches these to your learning hours.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Monday - Friday</p>
            <p className="font-bold text-indigo-900 text-lg">4:00 PM - 6:00 PM</p>
            <p className="text-xs text-gray-500 mt-1">2 hours daily</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Saturday</p>
            <p className="font-bold text-indigo-900 text-lg">12:00 PM - 3:00 PM</p>
            <p className="text-xs text-gray-500 mt-1">3 hours</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Sunday</p>
            <p className="font-bold text-gray-600 text-lg">Rest Day</p>
            <p className="text-xs text-gray-500 mt-1">🌴 No classes</p>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Complete Timetable</h3>
        <span className="text-sm text-gray-500">{total} periods total</span>
      </div>

      {/* DAY SECTIONS */}
      {orderedDays.map((day) => {
        const list = grouped[day];
        if (!list) return null;

        return (
          <div
            key={day}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white"
          >
            {/* DAY HEADER */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-4 text-white flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              <div className="flex-1">
                <span className="font-semibold text-lg">
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </span>
              </div>
              <span className="bg-white/20 px-3 py-1 text-xs rounded-full font-medium">
                {list.length} {list.length === 1 ? 'period' : 'periods'}
              </span>
            </div>

            {/* ENTRIES */}
            <div className="divide-y divide-gray-100">
              {list.map((entry, idx) => (
                <div key={idx} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* PERIOD BOX */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-indigo-50 border-2 border-indigo-300 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-600 font-medium">Period</span>
                        <span className="text-indigo-600 font-bold text-xl">
                          {entry.periodNumber}
                        </span>
                      </div>
                    </div>

                    {/* MAIN DETAILS */}
                    <div className="flex-1 min-w-0">
                      {/* SUBJECT NAME + CODE */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <h4 className="font-semibold text-gray-900 text-base">
                          {entry.subjectName}
                        </h4>
                        {/* ✅ SUBJECT CODE BADGE */}
                        {entry.subjectCode && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {entry.subjectCode}
                          </span>
                        )}
                      </div>

                      {/* TIME */}
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </span>
                      </div>

                      {/* EXTRA TAGS */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.room && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200">
                            <MapPin className="w-3 h-3" />
                            {entry.room}
                          </span>
                        )}

                        {entry.teacher && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200">
                            <User className="w-3 h-3" />
                            {entry.teacher}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MAPPING STATUS */}
                    <div className="flex-shrink-0">
                      {entry.subjectId ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded border border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">Mapped</span>
                          </div>
                          {entry.mappingConfidence !== null && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${confidenceBadge(
                                entry.mappingConfidence
                              )}`}
                            >
                              {(entry.mappingConfidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded border border-amber-200">
                          <XCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">
                            Not mapped
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* SUMMARY STATS */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          📊 Timetable Statistics
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium">Total Periods</p>
            <p className="text-3xl font-bold text-indigo-600">{total}</p>
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium">Days Covered</p>
            <p className="text-3xl font-bold text-purple-600">
              {Object.keys(grouped).length}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium">Unique Subjects</p>
            <p className="text-3xl font-bold text-blue-600">{uniqueSubjects}</p>
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-1 font-medium">Mapped Subjects</p>
            <p className="text-3xl font-bold text-green-600">
              {mapped}
              <span className="text-base text-gray-500">/{total}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((mapped / total) * 100).toFixed(0)}% coverage
            </p>
          </div>
        </div>
      </div>

      {/* UNMAPPED WARNING */}
      {entries.some((e) => !e.subjectId) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Some subjects haven't been mapped yet
              </p>
              <p className="text-xs text-amber-700">
                Unmapped subjects: {" "}
                {[...new Set(entries.filter((e) => !e.subjectId).map((e) => e.subjectName))]
                  .join(", ")}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                💡 Contact your administrator to map these subjects to your course catalog.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INFO BANNER */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How it works</p>
            <p className="text-xs">
              Your full school timetable is stored here. Our system automatically schedules these subjects 
              during your designated learning hours (Mon-Fri 4-6 PM, Sat 12-3 PM) to create your personalized 
              weekly study schedule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableEntriesDisplay;