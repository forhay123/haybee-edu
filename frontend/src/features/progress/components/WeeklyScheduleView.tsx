// WeeklyScheduleView.tsx - Updated to handle multiple student types per period
import React, { useMemo, useState, useEffect } from 'react';
import { useWeeklySchedules } from '../hooks/useWeeklySchedules';
import { WeeklyScheduleDto } from '../hooks/useWeeklySchedules';
import { Calendar, AlertCircle, Loader, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Users } from 'lucide-react';
import axiosInstance from '../../../api/axios';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

type ZoomLevel = 1 | 2 | 4 | 6 | 8;

interface TermInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  weekCount: number;
  isActive: boolean;
}

interface StudentType {
  id: string;
  name: string;
  displayName?: string;
}

interface StudentTypeApiResponse {
  id: number;
  name: string;
  displayName: string;
  code: string;
}

export const WeeklyScheduleView: React.FC = () => {
  const { data: schedules, isLoading, isError } = useWeeklySchedules();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(2);
  const [termInfo, setTermInfo] = useState<TermInfo | null>(null);
  const [loadingTerm, setLoadingTerm] = useState(true);
  const [selectedStudentType, setSelectedStudentType] = useState<string | 'all'>('all');
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [availableStudentTypes, setAvailableStudentTypes] = useState<StudentType[]>([]);

  // Fetch active term info and student types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [termResponse, studentTypesResponse] = await Promise.all([
          axiosInstance.get('/terms/active'),
          axiosInstance.get<StudentTypeApiResponse[]>('/weekly-schedules/student-types')
        ]);
        setTermInfo(termResponse.data);
        // Transform API response to use string IDs (the enum codes)
        const transformedTypes: StudentType[] = (studentTypesResponse.data || []).map(type => ({
          id: type.code,  // Use the code (e.g., "SCHOOL") as the ID
          name: type.displayName,
          displayName: type.displayName
        }));
        setStudentTypes(transformedTypes);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingTerm(false);
      }
    };
    fetchData();
  }, []);

  // Get unique student types from schedules and update state
  useEffect(() => {
    if (!schedules) {
      setAvailableStudentTypes([]);
      return;
    }
    
    const types = new Map<string, string>();
    schedules.forEach(schedule => {
      if (schedule.studentType && schedule.studentTypeName) {
        types.set(schedule.studentType, schedule.studentTypeName);
      }
    });
    
    const typesArray: StudentType[] = Array.from(types, ([code, name]): StudentType => ({ 
      id: code,  // This is the enum string: "SCHOOL", "HOME", "ASPIRANT"
      name: name // This is the display name: "School", "Home", "Aspirant"
    }));
    
    setAvailableStudentTypes(typesArray);
  }, [schedules]);

  // Filter schedules based on selected student type
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (selectedStudentType === 'all') return schedules;
    return schedules.filter(s => s.studentType === selectedStudentType);
  }, [schedules, selectedStudentType]);

  // Calculate week dates based on term start date
  const getWeekDates = useMemo(() => {
    if (!termInfo) return [];
    
    const termStart = new Date(termInfo.startDate);
    const weeks: Date[][] = [];
    
    for (let weekNum = selectedWeek; weekNum < selectedWeek + zoomLevel; weekNum++) {
      if (weekNum > termInfo.weekCount) break;
      
      const weekDates: Date[] = [];
      const weekStart = new Date(termStart);
      weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);
        weekDates.push(date);
      }
      weeks.push(weekDates);
    }
    
    return weeks;
  }, [termInfo, selectedWeek, zoomLevel]);

  const getDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFullDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePreviousWeek = () => {
    setSelectedWeek(prev => Math.max(1, prev - zoomLevel));
  };

  const handleNextWeek = () => {
    if (!termInfo) return;
    setSelectedWeek(prev => Math.min(termInfo.weekCount - zoomLevel + 1, prev + zoomLevel));
  };

  const handleCurrentWeek = () => {
    if (!termInfo) return;
    const today = new Date();
    const termStart = new Date(termInfo.startDate);
    const daysDiff = Math.floor((today.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysDiff / 7) + 1;
    setSelectedWeek(Math.max(1, Math.min(currentWeek, termInfo.weekCount)));
  };

  const handleZoomIn = () => {
    if (zoomLevel > 1) {
      setZoomLevel((prev) => {
        const newZoom = prev === 2 ? 1 : prev === 4 ? 2 : prev === 6 ? 4 : prev === 8 ? 6 : 1;
        return newZoom as ZoomLevel;
      });
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel < 8 && termInfo && selectedWeek + zoomLevel <= termInfo.weekCount) {
      setZoomLevel((prev) => {
        const newZoom = prev === 1 ? 2 : prev === 2 ? 4 : prev === 4 ? 6 : prev === 6 ? 8 : 8;
        return newZoom as ZoomLevel;
      });
    }
  };

  const getPriorityColor = (priority?: number) => {
    const colors: Record<number, string> = {
      1: 'bg-red-50 border-red-200',
      2: 'bg-orange-50 border-orange-200',
      3: 'bg-yellow-50 border-yellow-200',
      4: 'bg-green-50 border-green-200',
    };
    return colors[priority || 3] || 'bg-gray-50 border-gray-200';
  };

  const getPriorityIcon = (priority?: number) => {
    const icons: Record<number, string> = {
      1: '🔴',
      2: '🟠',
      3: '🟡',
      4: '🟢',
    };
    return icons[priority || 3] || '⚪';
  };

  const getStudentTypeColor = (studentType?: string) => {
    const colors: Record<string, string> = {
      'SCHOOL': 'bg-blue-100 text-blue-700 border-blue-300',
      'HOME': 'bg-purple-100 text-purple-700 border-purple-300',
      'ASPIRANT': 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[studentType || 'SCHOOL'] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loadingTerm || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!termInfo) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">No Active Term</h3>
            <p className="text-sm text-amber-800 mt-1">
              Please set an active term first to view the timetable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error Loading Schedule</h3>
            <p className="text-sm text-red-800 mt-1">Failed to load weekly schedules. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">No Schedules Yet</h3>
            <p className="text-sm text-blue-800 mt-1">
              Create a weekly schedule to see the timetable view here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const firstWeekDates = getWeekDates[0] || [];
  const lastWeekDates = getWeekDates[getWeekDates.length - 1] || [];
  const firstDate = firstWeekDates[0];
  const lastDate = lastWeekDates[6];

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-6 border-b bg-gray-50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Weekly Schedule Timetable
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {termInfo.name} • Week {selectedWeek}{zoomLevel > 1 && `-${Math.min(selectedWeek + zoomLevel - 1, termInfo.weekCount)}`} of {termInfo.weekCount}
              </p>
              {firstDate && lastDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {getFullDisplayDate(firstDate)} - {getFullDisplayDate(lastDate)}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom in (fewer weeks)"
                >
                  <ZoomIn className="w-5 h-5 text-gray-600" />
                </button>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium text-sm min-w-20 text-center">
                  {zoomLevel}w
                </div>
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel === 8 || selectedWeek + zoomLevel > termInfo.weekCount}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom out (more weeks)"
                >
                  <ZoomOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
                <button
                  onClick={handlePreviousWeek}
                  disabled={selectedWeek === 1}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous week(s)"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>

                <button
                  onClick={handleCurrentWeek}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  Current
                </button>

                <button
                  onClick={handleNextWeek}
                  disabled={selectedWeek + zoomLevel - 1 >= termInfo.weekCount}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next week(s)"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {availableStudentTypes.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4" />
                <span>Filter by Student Type:</span>
              </div>
              <button
                onClick={() => setSelectedStudentType('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedStudentType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Types
              </button>
              {availableStudentTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedStudentType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStudentType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-20 sticky left-0 bg-gray-50 z-10">
                Period
              </th>
              {getWeekDates.map((weekDates, weekIdx) => (
                <React.Fragment key={weekIdx}>
                  {weekDates.map((date, dayIdx) => (
                    <th
                      key={`${weekIdx}-${dayIdx}`}
                      className={`px-2 py-3 text-center text-xs font-semibold text-gray-700 border-l ${
                        zoomLevel > 2 ? 'min-w-32' : 'min-w-40'
                      }`}
                    >
                      <div className="font-medium">
                        {zoomLevel > 2 ? DAY_LABELS_SHORT[dayIdx] : DAY_LABELS[dayIdx]}
                      </div>
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        {getDisplayDate(date)}
                      </div>
                      {dayIdx === 0 && (
                        <div className="text-xs font-semibold text-blue-600 mt-1">
                          Week {selectedWeek + weekIdx}
                        </div>
                      )}
                    </th>
                  ))}
                  {weekIdx < getWeekDates.length - 1 && (
                    <th className="bg-gray-200 w-1"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => (
              <tr key={period} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border-r sticky left-0 z-10">
                  P{period}
                </td>
                {getWeekDates.map((weekDates, weekIdx) => (
                  <React.Fragment key={weekIdx}>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const currentWeekNumber = selectedWeek + weekIdx;
                      const cellSchedules = filteredSchedules.filter(
                        s => s.dayOfWeek === day && 
                             s.periodNumber === period && 
                             s.weekNumber === currentWeekNumber
                      );

                      return (
                        <td
                          key={`${weekIdx}-${day}-${period}`}
                          className={`px-2 py-2 text-xs border-l align-top ${
                            cellSchedules.length > 0
                              ? 'bg-white'
                              : 'bg-gray-50'
                          } border ${zoomLevel > 4 ? 'min-h-20' : 'min-h-32'}`}
                        >
                          {cellSchedules.length > 0 ? (
                            <div className="space-y-1.5">
                              {cellSchedules.map((schedule, idx) => (
                                <div
                                  key={`${schedule.id}-${idx}`}
                                  className={`p-1.5 rounded border ${getPriorityColor(schedule.priority)}`}
                                >
                                  <div className="space-y-0.5">
                                    {zoomLevel <= 2 && schedule.studentTypeName && (
                                      <div className={`text-xs px-1.5 py-0.5 rounded inline-block ${getStudentTypeColor(schedule.studentType)}`}>
                                        {schedule.studentTypeName}
                                      </div>
                                    )}
                                    <div className={`font-semibold text-gray-800 ${zoomLevel > 2 ? 'text-xs' : ''} line-clamp-1`}>
                                      {schedule.subjectName}
                                    </div>
                                    {zoomLevel <= 2 && schedule.className && (
                                      <div className="text-gray-600 text-xs line-clamp-1">
                                        {schedule.className}
                                      </div>
                                    )}
                                    {zoomLevel === 1 && schedule.lessonTopicTitle && (
                                      <div className="text-gray-600 text-xs line-clamp-1">
                                        {schedule.lessonTopicTitle}
                                      </div>
                                    )}
                                    {zoomLevel === 1 && schedule.startTime && schedule.endTime && (
                                      <div className="text-gray-500 text-xs">
                                        {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-300 text-center py-2">—</div>
                          )}
                        </td>
                      );
                    })}
                    {weekIdx < getWeekDates.length - 1 && (
                      <td className="bg-gray-200 w-1"></td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {getWeekDates.map((weekDates, weekIdx) => {
          const currentWeekNumber = selectedWeek + weekIdx;
          return (
            <div key={weekIdx} className="border-b">
              <div className="bg-blue-50 px-4 py-2 border-b sticky top-0 z-10">
                <h3 className="font-semibold text-blue-900">
                  Week {currentWeekNumber}: {getDisplayDate(weekDates[0])} - {getDisplayDate(weekDates[6])}
                </h3>
              </div>
              {DAYS_OF_WEEK.map((day, dayIdx) => (
                <div key={day} className="border-b">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-gray-800 text-sm">
                      {DAY_LABELS[dayIdx]} <span className="text-xs font-normal text-gray-600">({getDisplayDate(weekDates[dayIdx])})</span>
                    </h4>
                  </div>
                  <div className="divide-y">
                    {PERIODS.map(period => {
                      const cellSchedules = filteredSchedules.filter(
                        s => s.dayOfWeek === day && 
                             s.periodNumber === period && 
                             s.weekNumber === currentWeekNumber
                      );

                      return (
                        <div key={`${day}-${period}`} className="p-3">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            Period {period}
                          </div>
                          {cellSchedules.length > 0 ? (
                            <div className="space-y-2">
                              {cellSchedules.map((schedule, idx) => (
                                <div
                                  key={`${schedule.id}-${idx}`}
                                  className={`p-3 rounded-lg border-2 ${getPriorityColor(schedule.priority)}`}
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    <span>{getPriorityIcon(schedule.priority)}</span>
                                    <div className="flex-1">
                                      {schedule.studentTypeName && (
                                        <div className={`text-xs px-2 py-0.5 rounded inline-block mb-1 ${getStudentTypeColor(schedule.studentType)}`}>
                                          {schedule.studentTypeName}
                                        </div>
                                      )}
                                      <div className="font-semibold text-gray-800 text-sm">
                                        {schedule.subjectName}
                                      </div>
                                      {schedule.className && (
                                        <div className="text-xs text-gray-600">
                                          {schedule.className}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {schedule.lessonTopicTitle && (
                                    <div className="text-xs text-gray-700 mb-1">
                                      {schedule.lessonTopicTitle}
                                    </div>
                                  )}
                                  {schedule.startTime && schedule.endTime && (
                                    <div className="text-xs text-gray-500">
                                      ⏰ {schedule.startTime.substring(0, 5)} - {schedule.endTime.substring(0, 5)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 italic text-sm">No lesson</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border-t p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="font-medium text-gray-700 text-sm">Priority:</div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span>🔴</span>
              <span className="text-gray-700">Critical</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>🟠</span>
              <span className="text-gray-700">High</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>🟡</span>
              <span className="text-gray-700">Medium</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>🟢</span>
              <span className="text-gray-700">Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};