// frontend/src/features/individual/components/teacher/TimetableReadOnlyView.tsx

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Clock,
  FileText,
  RefreshCw,
  Calendar,
  User,
  Upload,
  Info,
  Lock,
} from "lucide-react";
import { timetableApi } from "../../api/individualApi";
import { IndividualTimetableDto } from "../../types/individualTypes";
import { ProcessingStatusIndicator } from "../ProcessingStatusIndicator";
import { formatDistanceToNow } from "date-fns";

interface TimetableReadOnlyViewProps {
  timetableId: number;
  showStudentInfo?: boolean;
}

interface TimetableEntry {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  subjectName?: string;
  extractedSubject?: string;
  subjectId?: number;
  confidence?: number;
}

const TimetableReadOnlyView: React.FC<TimetableReadOnlyViewProps> = ({
  timetableId,
  showStudentInfo = true,
}) => {
  // Fetch timetable details
  const { data: timetable, isLoading, error } = useQuery<IndividualTimetableDto>({
    queryKey: ["timetable-detail", timetableId],
    queryFn: () => timetableApi.getById(timetableId),
  });

  // Fetch timetable entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery<TimetableEntry[]>({
    queryKey: ["timetable-entries", timetableId],
    queryFn: () => timetableApi.getEntries(timetableId),
    enabled: !!timetable && timetable.processingStatus === "COMPLETED",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading timetable details...</span>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load timetable details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-Only Notice */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Read-only view:</strong> You can view this timetable but cannot make changes. 
          Contact an administrator if corrections are needed.
        </AlertDescription>
      </Alert>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {timetable.originalFilename}
              </CardTitle>
              <CardDescription>
                Timetable ID: {timetable.id}
              </CardDescription>
            </div>
            <ProcessingStatusIndicator status={timetable.processingStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Student Info */}
          {showStudentInfo && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Student</p>
                    <p className="text-sm text-muted-foreground">
                      {timetable.studentName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Uploaded</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(timetable.uploadedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Academic Info */}
          {(timetable.academicYear || timetable.termId) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {timetable.academicYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Academic Year</p>
                      <p className="text-sm text-muted-foreground">
                        {timetable.academicYear}
                      </p>
                    </div>
                  </div>
                )}
                {timetable.termId && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Term</p>
                      <p className="text-sm text-muted-foreground">
                        {timetable.termName || `Term ${timetable.termId}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Confidence Score */}
          {timetable.confidenceScore !== undefined && timetable.confidenceScore !== null && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Extraction Confidence</p>
                  <Badge
                    variant={
                      timetable.confidenceScore >= 0.8
                        ? "default"
                        : timetable.confidenceScore >= 0.6
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {timetable.confidenceScore >= 0.8
                      ? "High"
                      : timetable.confidenceScore >= 0.6
                      ? "Medium"
                      : "Low"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        timetable.confidenceScore >= 0.8
                          ? "bg-green-500"
                          : timetable.confidenceScore >= 0.6
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${timetable.confidenceScore * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {(timetable.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
                {timetable.confidenceScore < 0.7 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <Info className="h-3 w-3 inline mr-1" />
                    Low confidence may indicate extraction issues. Some data may need verification.
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Processing Status Messages */}
          {timetable.processingStatus === "PENDING" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This timetable is queued for processing. Check back shortly.
              </AlertDescription>
            </Alert>
          )}

          {timetable.processingStatus === "PROCESSING" && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                This timetable is currently being processed. This may take a few moments.
              </AlertDescription>
            </Alert>
          )}

          {timetable.processingStatus === "FAILED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Processing failed.</strong> Please contact an administrator to reprocess this timetable.
                {timetable.processingError && (
                  <div className="mt-2 text-xs">
                    Error: {timetable.processingError}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Entries */}
      {timetable.processingStatus === "COMPLETED" && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              {entries.length} {entries.length === 1 ? 'class' : 'classes'} per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading schedule...</span>
              </div>
            ) : entries.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No schedule entries found for this timetable.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{entries.length}</p>
                    <p className="text-xs text-muted-foreground">Total Classes</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {new Set(entries.map((e) => e.dayOfWeek).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Days</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {new Set(entries.map((e) => e.subjectName || e.extractedSubject).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                  </div>
                </div>

                {/* Schedule Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {entry.dayOfWeek || "N/A"}
                        </TableCell>
                        <TableCell>
                          {entry.startTime && entry.endTime
                            ? `${entry.startTime} - ${entry.endTime}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {entry.subjectName || entry.extractedSubject || "Unknown"}
                            </span>
                            {!entry.subjectName && entry.extractedSubject && (
                              <Badge variant="outline" className="text-xs">
                                Unmapped
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.confidence !== undefined && entry.confidence !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-secondary rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    entry.confidence >= 0.8
                                      ? "bg-green-500"
                                      : entry.confidence >= 0.6
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${entry.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {(entry.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Low Confidence Warning */}
                {entries.some((e) => e.confidence !== undefined && e.confidence < 0.7) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Some entries have low confidence scores. The extracted data may need verification.
                      Contact an administrator if you notice any errors.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimetableReadOnlyView;