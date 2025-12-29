// ============================================================
// FILE 1: AssignmentCard.tsx (FIXED)
// Path: frontend/src/features/individual/components/teacher/AssignmentCard.tsx
// ============================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { getUrgencyLevel } from "../../types/assignmentTypes";
import { useSuggestedTopics, useAssignTopicToSchedule } from "../../hooks/teacher/usePendingAssignments";

interface AssignmentCardProps {
  assignment: PendingAssignmentDto;
  onSuccess?: () => void;
}

const getLoggedInUserId = () => {
  return Number(localStorage.getItem("userId") || 1);
};

export function AssignmentCard({ assignment, onSuccess }: AssignmentCardProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loggedInUserId = getLoggedInUserId();

  const { data: suggestedTopics, isLoading: loadingSuggestions } = useSuggestedTopics(
    assignment.scheduleId,
    expanded
  );

  const { mutate: assignTopic, isPending } = useAssignTopicToSchedule();

  const urgency = getUrgencyLevel(assignment.daysPending);

  const urgencyStyles = {
    critical: "border-red-300 bg-red-50",
    high: "border-orange-300 bg-orange-50",
    medium: "border-yellow-300 bg-yellow-50",
    low: "border-blue-300 bg-blue-50",
  };

  const handleAssign = () => {
    if (!selectedTopicId) return;

    assignTopic(
      {
        scheduleId: assignment.scheduleId,
        lessonTopicId: selectedTopicId,
        assignedByUserId: loggedInUserId,
        assignmentMethod: "TEACHER_MANUAL",
      },
      {
        onSuccess: () => {
          onSuccess?.();
          setExpanded(false);
          setSelectedTopicId(null);
        },
      }
    );
  };

  return (
    <Card className={`border-2 ${urgencyStyles[urgency]} transition-all`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-medium">
                {assignment.subjectName}
              </Badge>
              {assignment.weekNumber && (
                <Badge variant="secondary">Week {assignment.weekNumber}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{assignment.className}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "Show"} Topics
          </Button>
        </div>

        {/* Schedule Info */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium">
                {new Date(assignment.scheduledDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Period</p>
              <p className="font-medium">
                Period {assignment.periodNumber} ({assignment.startTime})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              {/* ✅ FIXED: Changed "destructive" to "danger" */}
              <Badge
                variant={urgency === "critical" || urgency === "high" ? "danger" : "secondary"}
              >
                {urgency === "critical"
                  ? "Overdue"
                  : urgency === "high"
                  ? "Today"
                  : urgency === "medium"
                  ? "Tomorrow"
                  : `${assignment.daysPending} days`}
              </Badge>
            </div>
          </div>
        </div>

        {/* Suggested Topics */}
        {expanded && (
          <div className="border-t pt-3 mt-3">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Select Topic to Assign
            </h4>

            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading suggestions...
                </span>
              </div>
            ) : suggestedTopics && suggestedTopics.length > 0 ? (
              <div className="space-y-2 mb-3">
                {suggestedTopics.map((topic: any, index: number) => (
                  <button
                    key={topic.topicId || topic.id}
                    onClick={() => setSelectedTopicId(topic.topicId || topic.id)}
                    className={`
                      w-full text-left p-3 border rounded-lg transition-all
                      ${
                        selectedTopicId === (topic.topicId || topic.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Best Match
                          </Badge>
                        )}
                        {topic.hasAssessment && (
                          <Badge variant="secondary" className="text-xs">
                            <ClipboardCheck className="w-3 h-3 mr-1" />
                            Assessment
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {topic.topicTitle || topic.title}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {topic.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>Week {topic.weekNumber}</span>
                          {topic.hasAssessment && topic.questionCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {topic.questionCount} questions
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedTopicId === (topic.topicId || topic.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                No suggested topics available
              </div>
            )}

            {/* Assign Button */}
            <Button
              onClick={handleAssign}
              disabled={!selectedTopicId || isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Assign Topic
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}