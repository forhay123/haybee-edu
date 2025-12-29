// frontend/src/features/individual/components/admin/PendingAssignmentsStats.tsx

import { Card } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { 
  Calendar, 
  BookOpen, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

interface PendingAssignmentsStatsProps {
  totalPending: number;
  bySubject: Record<string, number>;
  byWeek: Record<number, number>;
  byStudent: Record<string, number>;
  urgentCount: number;
  withSuggestionsCount: number;
  isLoading?: boolean;
}

export function PendingAssignmentsStats({
  totalPending,
  bySubject,
  byWeek,
  byStudent,
  urgentCount,
  withSuggestionsCount,
  isLoading = false,
}: PendingAssignmentsStatsProps) {
  const topSubjects = Object.entries(bySubject)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const upcomingWeeks = Object.entries(byWeek)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(0, 4);

  const topStudents = Object.entries(byStudent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Pending */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Pending</p>
            <p className="text-3xl font-bold mt-2">{totalPending}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Schedules awaiting topic assignment
        </p>
      </Card>

      {/* Urgent Assignments */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Urgent</p>
            <p className="text-3xl font-bold mt-2 text-orange-600">
              {urgentCount}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Due within 2 days or overdue
        </p>
      </Card>

      {/* With Suggestions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              With Suggestions
            </p>
            <p className="text-3xl font-bold mt-2 text-green-600">
              {withSuggestionsCount}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          {totalPending > 0
            ? `${Math.round((withSuggestionsCount / totalPending) * 100)}% of total`
            : "No pending assignments"}
        </p>
      </Card>

      {/* By Subject Breakdown */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Top Subjects</p>
            <p className="text-xs text-gray-500">
              {Object.keys(bySubject).length} subjects total
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {topSubjects.length > 0 ? (
            topSubjects.map(([subject, count]) => (
              <div key={subject} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate flex-1">
                  {subject}
                </span>
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      </Card>

      {/* By Week Breakdown */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Upcoming Weeks</p>
            <p className="text-xs text-gray-500">
              Next {upcomingWeeks.length} weeks
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {upcomingWeeks.length > 0 ? (
            upcomingWeeks.map(([week, count]) => (
              <div key={week} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Week {week}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      </Card>

      {/* By Student Breakdown */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Top Students</p>
            <p className="text-xs text-gray-500">
              {Object.keys(byStudent).length} students total
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {topStudents.length > 0 ? (
            topStudents.map(([student, count]) => (
              <div key={student} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate flex-1">
                  {student}
                </span>
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}