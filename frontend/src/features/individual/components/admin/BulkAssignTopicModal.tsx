import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader2, Users, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { 
  useAssignSameTopicToMultiple,
  useSuggestedTopics 
} from "../../hooks/admin/useMissingTopicAssignment";
import { validateBulkAssignment } from "../../types/assignmentTypes";

const getLoggedInUserId = () => {
  return Number(localStorage.getItem("userId") || 1);
};

interface BulkAssignTopicModalProps {
  open: boolean;
  onClose: () => void;
  scheduleIds: number[];
  assignments: PendingAssignmentDto[] | undefined;
  onSuccess: () => void;
}

export function BulkAssignTopicModal({
  open,
  onClose,
  scheduleIds,
  assignments = [],
  onSuccess,
}: BulkAssignTopicModalProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const loggedInUserId = getLoggedInUserId();

  const { mutate: bulkAssignTopic, isPending } = useAssignSameTopicToMultiple();

  const validation = assignments.length > 0 
    ? validateBulkAssignment(assignments, selectedTopicId || 0)
    : null;

  const firstScheduleId = scheduleIds[0] || 0;
  const { data: suggestedTopics, isLoading: loadingSuggestions } = 
    useSuggestedTopics(
      firstScheduleId,
      open && scheduleIds.length > 0 && validation?.isValid
    );

  useEffect(() => {
    if (open) {
      setSelectedTopicId(null);
      setSelectedTopic(null);
      setNotes("");
    }
  }, [open]);

  if (!open || scheduleIds.length === 0) return null;

  const handleTopicSelect = (topic: any) => {
    setSelectedTopicId(topic.topicId || topic.id);
    setSelectedTopic(topic);
  };

  const handleAssign = () => {
    if (!selectedTopicId || !validation?.isValid) return;

    bulkAssignTopic(
      {
        scheduleIds,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Bulk Assign Lesson Topic</h2>
              <p className="text-sm text-gray-600">
                Assign the same topic to {scheduleIds.length} schedules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isPending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Validation Errors */}
          {validation && !validation.isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Cannot bulk assign:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validation && validation.isValid && validation.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ Assessment Info - Shows when topic with assessment is selected */}
          {selectedTopic?.hasAssessment && validation?.isValid && (
            <Alert className="border-purple-200 bg-purple-50">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <div className="font-medium mb-1">📝 Assessment Will Be Assigned</div>
                <p className="text-sm">
                  This topic includes an assessment with <strong>{selectedTopic.questionCount} questions</strong>. 
                  The assessment will be available to all {scheduleIds.length} students during their scheduled periods.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Info */}
          {validation && validation.isValid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Bulk Assignment Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Subject:</span>
                  <p className="text-blue-900">{validation.subjectName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Schedules:</span>
                  <p className="text-blue-900">{validation.scheduleCount} schedules</p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Details */}
          {assignments.length > 0 && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                Selected Schedules ({assignments.length})
              </Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Student</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Period</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {assignments.map((assignment) => (
                        <tr key={assignment.scheduleId} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{assignment.studentName}</td>
                          <td className="px-3 py-2">
                            {new Date(assignment.scheduledDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">Period {assignment.periodNumber}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {assignment.startTime} - {assignment.endTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Topics */}
          {validation?.isValid && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                Select Lesson Topic
              </Label>

              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading suggestions...</span>
                </div>
              ) : suggestedTopics && suggestedTopics.length > 0 ? (
                <div className="space-y-2">
                  {suggestedTopics.map((topic: any, index: number) => (
                    <button
                      key={topic.topicId || topic.id}
                      onClick={() => handleTopicSelect(topic)}
                      className={`w-full text-left p-4 border rounded-lg transition-all ${
                        selectedTopicId === (topic.topicId || topic.id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 flex flex-col gap-1">
                          {index === 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Recommended
                            </span>
                          )}
                          
                          {/* ✅ NEW: Assessment badge */}
                          {topic.hasAssessment && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <ClipboardCheck className="w-3 h-3 mr-1" />
                              Assessment
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">
                            {topic.topicTitle || topic.title}
                          </h4>

                          {topic.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {topic.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Week {topic.weekNumber}</span>
                            
                            {/* ✅ NEW: Show question count */}
                            {topic.hasAssessment && topic.questionCount > 0 && (
                              <span className="flex items-center gap-1 text-purple-600">
                                <FileText className="w-3 h-3" />
                                {topic.questionCount} questions
                              </span>
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
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No lesson topics available for this subject.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Notes */}
          {validation?.isValid && (
            <div>
              <Label htmlFor="bulk-notes" className="text-base font-medium mb-2 block">
                Notes (Optional)
              </Label>
              <textarea
                id="bulk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes that will apply to all selected schedules..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedTopicId || !validation?.isValid || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning to {scheduleIds.length} schedules...
              </>
            ) : (
              <>
                {selectedTopic?.hasAssessment ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Assign Topic & Assessment to {scheduleIds.length}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assign to {scheduleIds.length} Schedules
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}