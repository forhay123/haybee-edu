// frontend/src/features/individual/components/admin/TimetableDetailView.tsx

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Trash2,
  Calendar,
  User,
  Upload,
  Edit,
} from "lucide-react";
import { timetableApi, adminTimetableApi } from "../../api/individualApi";
import { IndividualTimetableDto } from "../../types/individualTypes";
import { ProcessingStatusIndicator } from "../ProcessingStatusIndicator";
import SubjectMappingEditor from "./SubjectMappingEditor";
import { formatDistanceToNow } from "date-fns";

interface TimetableDetailViewProps {
  timetableId: number;
  onDelete?: () => void;
  onReprocess?: () => void;
}

const TimetableDetailView: React.FC<TimetableDetailViewProps> = ({
  timetableId,
  onDelete,
  onReprocess,
}) => {
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<number | null>(null);

  // Fetch timetable details
  const { data: timetable, isLoading, error } = useQuery<IndividualTimetableDto>({
    queryKey: ["timetable-detail", timetableId],
    queryFn: () => timetableApi.getById(timetableId),
  });

  // Fetch timetable entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery<any[]>({
    queryKey: ["timetable-entries", timetableId],
    queryFn: () => timetableApi.getEntries(timetableId),
    enabled: !!timetable && timetable.processingStatus === "COMPLETED",
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => timetableApi.delete(timetableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timetables"] });
      onDelete?.();
    },
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: () => adminTimetableApi.reprocessTimetable(timetableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-detail", timetableId] });
      queryClient.invalidateQueries({ queryKey: ["admin-timetables"] });
      onReprocess?.();
    },
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Student</p>
                <p className="text-sm text-muted-foreground">
                  {timetable.studentName} (ID: {timetable.studentProfileId})
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

          {/* Academic Info */}
          {(timetable.academicYear || timetable.termId) && (
            <>
              <Separator />
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
                        Term {timetable.termId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Confidence Score */}
          {timetable.confidenceScore !== null && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Confidence Score</p>
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
              </div>
            </>
          )}

          {/* Processing Logs */}
          {timetable.processingLogs && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Processing Logs</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {timetable.processingLogs}
                </pre>
              </div>
            </>
          )}

          {/* Error Message */}
          {timetable.errorMessage && (
            <>
              <Separator />
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {timetable.errorMessage}
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="flex gap-2">
            {timetable.processingStatus === "FAILED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                Reprocess
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Entries */}
      {timetable.processingStatus === "COMPLETED" && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Schedule Entries</CardTitle>
            <CardDescription>
              {entries.length} entries extracted from the timetable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No entries found for this timetable.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        {entry.subjectName || entry.extractedSubject || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {entry.confidence ? (
                          <Badge
                            variant={
                              entry.confidence >= 0.8
                                ? "default"
                                : entry.confidence >= 0.6
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {(entry.confidence * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingEntry === index ? (
                          <SubjectMappingEditor
                            timetableId={timetableId}
                            entryIndex={index}
                            currentSubjectId={entry.subjectId}
                            extractedSubject={entry.extractedSubject}
                            onSuccess={() => {
                              setEditingEntry(null);
                              queryClient.invalidateQueries({
                                queryKey: ["timetable-entries", timetableId],
                              });
                            }}
                            onCancel={() => setEditingEntry(null)}
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingEntry(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimetableDetailView;