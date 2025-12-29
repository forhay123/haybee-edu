// frontend/src/features/individual/components/teacher/StudentTimetableCard.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  AlertTriangle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { IndividualTimetableDto } from "../../types/individualTypes";
import { ProcessingStatusIndicator } from "../ProcessingStatusIndicator";
import { formatDistanceToNow } from "date-fns";

interface StudentTimetableCardProps {
  student: {
    studentId: number;
    studentName: string;
    timetables: IndividualTimetableDto[];
    latestTimetable: IndividualTimetableDto | null;
    totalUploads: number;
    hasFailedUploads: boolean;
    hasProcessingUploads: boolean;
  };
  onViewDetails?: () => void;
}

const StudentTimetableCard: React.FC<StudentTimetableCardProps> = ({
  student,
  onViewDetails,
}) => {
  const navigate = useNavigate();

  const {
    studentId,
    studentName,
    timetables = [],
    latestTimetable,
    totalUploads = 0,
    hasFailedUploads = false,
    hasProcessingUploads = false,
  } = student;

  // Get student initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ✅ NEW: Extract unique subjects from latest timetable
  const extractedSubjects = React.useMemo(() => {
    if (!latestTimetable?.entries || latestTimetable.entries.length === 0) {
      return [];
    }

    // Get unique subjects with their codes
    const subjectsMap = new Map<number, { id: number; name: string; code?: string }>();
    
    latestTimetable.entries.forEach((entry) => {
      if (entry.subjectId) {
        subjectsMap.set(entry.subjectId, {
          id: entry.subjectId,
          name: entry.subjectName,
          code: entry.subjectCode, // Assuming this exists in TimetableEntryDto
        });
      }
    });

    return Array.from(subjectsMap.values());
  }, [latestTimetable]);

  // Calculate average confidence score
  const averageConfidence = React.useMemo(() => {
    if (!Array.isArray(timetables) || timetables.length === 0) return null;
    
    const completedTimetables = timetables.filter(
      (t) => t.processingStatus === "COMPLETED" && t.confidenceScore !== undefined
    );
    if (completedTimetables.length === 0) return null;

    const sum = completedTimetables.reduce(
      (acc, t) => acc + (t.confidenceScore || 0),
      0
    );
    return sum / completedTimetables.length;
  }, [timetables]);

  // Get status summary
  const getStatusSummary = () => {
    if (totalUploads === 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: "No timetable uploaded",
        variant: "secondary" as const,
      };
    }
    if (hasFailedUploads) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "Has failed uploads",
        variant: "destructive" as const,
      };
    }
    if (hasProcessingUploads) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: "Processing...",
        variant: "secondary" as const,
      };
    }
    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: "Up to date",
      variant: "default" as const,
    };
  };

  const statusSummary = getStatusSummary();

  const completedCount = Array.isArray(timetables) 
    ? timetables.filter((t) => t.processingStatus === "COMPLETED").length 
    : 0;
    
  const failedCount = Array.isArray(timetables)
    ? timetables.filter((t) => t.processingStatus === "FAILED").length
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(studentName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{studentName}</CardTitle>
              <CardDescription className="text-xs">
                Student ID: {studentId}
              </CardDescription>
            </div>
          </div>
          <Badge variant={statusSummary.variant} className="flex items-center gap-1">
            {statusSummary.icon}
            {statusSummary.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{totalUploads}</p>
            <p className="text-xs text-muted-foreground">Total Uploads</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{failedCount}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Latest Timetable Info */}
        {latestTimetable && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Latest Timetable</p>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{latestTimetable.originalFilename}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(latestTimetable.uploadedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {latestTimetable.academicYear && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{latestTimetable.academicYear}</span>
                  </div>
                )}
              </div>
              <ProcessingStatusIndicator status={latestTimetable.processingStatus} />
            </div>

            {/* ✅ NEW: Display extracted subjects with codes */}
            {extractedSubjects.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">
                    Subjects ({extractedSubjects.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedSubjects.slice(0, 5).map((subject) => (
                    <Badge
                      key={subject.id}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {subject.code || subject.name}
                    </Badge>
                  ))}
                  {extractedSubjects.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{extractedSubjects.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Score */}
            {averageConfidence !== null && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Avg. Confidence</span>
                  <span className="font-medium">
                    {(averageConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      averageConfidence >= 0.8
                        ? "bg-green-500"
                        : averageConfidence >= 0.6
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${averageConfidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Timetable Message */}
        {totalUploads === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No timetable uploaded yet</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails?.()}
            disabled={totalUploads === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            View All ({totalUploads})
          </Button>
          {latestTimetable && (
            <Button
              variant="default"
              onClick={() => 
                navigate(`/teacher/individual/students/${studentId}/timetable/${latestTimetable.id}`)
              }
            >
              <FileText className="h-4 w-4 mr-2" />
              Latest
            </Button>
          )}
        </div>

        {/* Warning Messages */}
        {hasFailedUploads && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Failed uploads detected</p>
              <p className="text-xs text-muted-foreground">
                Some timetables failed to process and may need attention.
              </p>
            </div>
          </div>
        )}

        {averageConfidence !== null && averageConfidence < 0.7 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-yellow-600">Low confidence</p>
              <p className="text-xs text-muted-foreground">
                Extracted data may need verification.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentTimetableCard;