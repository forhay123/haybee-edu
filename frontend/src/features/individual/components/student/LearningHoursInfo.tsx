// frontend/src/features/individual/components/student/LearningHoursInfo.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Sun } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LearningHoursInfoProps {
  compact?: boolean;
  showTitle?: boolean;
}

export function LearningHoursInfo({ 
  compact = false, 
  showTitle = true 
}: LearningHoursInfoProps) {
  const getLearningHours = (dayOfWeek: string) => {
    const day = dayOfWeek.toUpperCase();
    
    switch (day) {
      case 'MONDAY':
      case 'TUESDAY':
      case 'WEDNESDAY':
      case 'THURSDAY':
      case 'FRIDAY':
        return { start: '4:00 PM', end: '6:00 PM', isRestDay: false };
      case 'SATURDAY':
        return { start: '12:00 PM', end: '3:00 PM', isRestDay: false };
      case 'SUNDAY':
        return { start: null, end: null, isRestDay: true };
      default:
        return { start: null, end: null, isRestDay: false };
    }
  };

  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-medium">Learning Hours</span>
        </div>
        <div className="space-y-1 pl-6">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mon - Fri:</span>
            <span className="font-medium">4:00 PM - 6:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saturday:</span>
            <span className="font-medium">12:00 PM - 3:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sunday:</span>
            <span className="font-medium text-green-600">Rest Day 🌴</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        {showTitle && (
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Your Learning Hours
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weekdays */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">
              Monday - Friday
            </div>
            <div className="text-2xl font-bold text-blue-600">
              4:00 PM - 6:00 PM
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              2 hours of focused learning daily
            </div>
          </div>
        </div>

        {/* Saturday */}
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">
              Saturday
            </div>
            <div className="text-2xl font-bold text-purple-600">
              12:00 PM - 3:00 PM
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              3 hours of weekend learning
            </div>
          </div>
        </div>

        {/* Sunday - Rest Day */}
        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="p-2 bg-green-100 rounded-lg">
            <Sun className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">
              Sunday
            </div>
            <div className="text-2xl font-bold text-green-600">
              Rest Day 🌴
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Take time to relax and recharge
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get learning hours for a specific day
export function getDayLearningHours(dayOfWeek: string): {
  start: string | null;
  end: string | null;
  isRestDay: boolean;
  duration: string;
} {
  const day = dayOfWeek.toUpperCase();
  
  switch (day) {
    case 'MONDAY':
    case 'TUESDAY':
    case 'WEDNESDAY':
    case 'THURSDAY':
    case 'FRIDAY':
      return { 
        start: '16:00', 
        end: '18:00', 
        isRestDay: false,
        duration: '2 hours'
      };
    case 'SATURDAY':
      return { 
        start: '12:00', 
        end: '15:00', 
        isRestDay: false,
        duration: '3 hours'
      };
    case 'SUNDAY':
      return { 
        start: null, 
        end: null, 
        isRestDay: true,
        duration: 'Rest Day'
      };
    default:
      return { 
        start: null, 
        end: null, 
        isRestDay: false,
        duration: 'N/A'
      };
  }
}

// Helper function to format time in 12-hour format
export function formatLearningTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}