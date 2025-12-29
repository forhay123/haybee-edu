// ============================================================
// FILE 2: BulkAssignmentPanel.tsx
// Path: frontend/src/features/individual/components/teacher/BulkAssignmentPanel.tsx
// ============================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BookOpen,
} from "lucide-react";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { validateBulkAssignment } from "../../types/assignmentTypes";
import { useSuggestedTopics, useAssignSameTopicToMultiple } from "../../hooks/teacher/usePendingAssignments";

interface BulkAssignmentPanelProps {
  selectedIds: number[];
  assignments: PendingAssignmentDto[];
  onCancel: () => void;
  onSuccess: () => void;
}

const getLoggedInUserId = () => {
  return Number(localStorage.getItem("userId") || 1);
};

export function BulkAssignmentPanel({
  selectedIds,
  assignments,
  onCancel,
  onSuccess,
}: BulkAssignmentPanelProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { mutate: assignTopic, isPending } = useAssignSameTopicToMultiple();

  // Validate bulk assignment
  const validation = validateBulkAssignment(assignments, selectedTopicId || 0);

  // Get suggestions for first schedule (all should have same subject)
  const { data: suggestedTopics, isLoading: loadingSuggestions } = useSuggestedTopics(
    assignments[0]?.scheduleId || 0,
    !!assignments[0]?.scheduleId
  );

  const handleAssign = () => {
    if (!selectedTopicId || !validation.isValid) return;

    assignTopic(
      {
        scheduleIds: selectedIds,
        lessonTopicId: selectedTopicId,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
      }
    );
  };

  return (
    <Card className="border-2 border-blue-500 bg-blue-50 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Bulk Assign Topic
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign the same topic to {selectedIds.length} selected schedule
            {selectedIds.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Subject Info */}
      {validation.allSameSubject && (
        <div className="bg-white rounded-lg p-3 mb-4 border">
          <p className="text-sm text-gray-600">Assigning to:</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-medium">
              {validation.subjectName}
            </Badge>
            <Badge variant="secondary">
              {validation.scheduleCount} schedule{validation.scheduleCount > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      )}

      {/* Topic Selection */}
      {validation.isValid && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Select Topic
            </label>

            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-6 bg-white rounded-lg border">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading suggestions...
                </span>
              </div>
            ) : suggestedTopics && suggestedTopics.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestedTopics.map((topic: any, index: number) => (
                  <button
                    key={topic.topicId || topic.id}
                    onClick={() => setSelectedTopicId(topic.topicId || topic.id)}
                    className={`
                      w-full text-left p-3 bg-white border rounded-lg transition-all
                      ${
                        selectedTopicId === (topic.topicId || topic.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300"
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">
                          Best Match
                        </Badge>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {topic.topicTitle || topic.title}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {topic.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Week {topic.weekNumber}
                        </p>
                      </div>
                      {selectedTopicId === (topic.topicId || topic.id) && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No suggested topics available for this subject.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="bulk-notes" className="text-sm font-medium text-gray-900 mb-2 block">
              Notes (Optional)
            </label>
            <textarea
              id="bulk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for students..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedTopicId || isPending}
              className="flex-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Assign to {selectedIds.length} Schedule{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
