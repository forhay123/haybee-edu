import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader2, FileText, ClipboardCheck } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { 
  useAssignTopic, 
  useSuggestedTopics 
} from "../../hooks/admin/useMissingTopicAssignment";

const getLoggedInUserId = () => {
  return Number(localStorage.getItem("userId") || 1);
};

interface AssignTopicModalProps {
  open: boolean;
  onClose: () => void;
  assignment: PendingAssignmentDto | null;
  onSuccess: () => void;
}

export function AssignTopicModal({
  open,
  onClose,
  assignment,
  onSuccess,
}: AssignTopicModalProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const loggedInUserId = getLoggedInUserId();

  const { mutate: assignTopic, isPending } = useAssignTopic();

  const { data: suggestedTopics, isLoading: loadingSuggestions } = 
    useSuggestedTopics(
      assignment?.scheduleId || 0,
      open && !!assignment?.scheduleId
    );

  useEffect(() => {
    if (open && assignment) {
      setSelectedTopicId(null);
      setSelectedTopic(null);
      setNotes("");
    }
  }, [open, assignment]);

  if (!open || !assignment) return null;

  const handleTopicSelect = (topic: any) => {
    setSelectedTopicId(topic.topicId || topic.id);
    setSelectedTopic(topic);
  };

  const handleAssign = () => {
    if (!selectedTopicId) return;

    assignTopic(
      {
        scheduleId: assignment.scheduleId,
        lessonTopicId: selectedTopicId,
        notes: notes.trim() || undefined,
        assignedByUserId: loggedInUserId,
        assignmentMethod: "ADMIN_MANUAL",
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Assign Lesson Topic</h2>
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

          {/* Schedule Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Schedule Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Student:</span>
                <p className="text-blue-900">{assignment.studentName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Subject:</span>
                <p className="text-blue-900">{assignment.subjectName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Week:</span>
                <p className="text-blue-900">Week {assignment.weekNumber || "N/A"}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Date:</span>
                <p className="text-blue-900">
                  {new Date(assignment.scheduledDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Period:</span>
                <p className="text-blue-900">Period {assignment.periodNumber}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Time:</span>
                <p className="text-blue-900">
                  {assignment.startTime} - {assignment.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ Assessment Info Alert - Shows when topic with assessment is selected */}
          {selectedTopic?.hasAssessment && (
            <Alert className="border-purple-200 bg-purple-50">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                <div className="font-medium mb-1">📝 Assessment Included</div>
                <p className="text-sm">
                  This topic includes an assessment with <strong>{selectedTopic.questionCount} questions</strong> that will be 
                  available to the student during the scheduled period ({assignment.startTime} - {assignment.endTime}).
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Suggested Topics */}
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
                            Best Match
                          </span>
                        )}
                        
                        {/* ✅ NEW: Assessment badge */}
                        {topic.hasAssessment && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <ClipboardCheck className="w-3 h-3 mr-1" />
                            Assessment
                          </span>
                        )}
                        
                        {topic.alreadyUsedByStudent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Previously Used
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
                          
                          {/* ✅ NEW: Show question count if assessment exists */}
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
                  No lesson topics available for this subject and week.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-medium mb-2 block">
              Notes (Optional)
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the student..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedTopicId || isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                {selectedTopic?.hasAssessment ? (
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Assign {selectedTopic?.hasAssessment ? "Topic & Assessment" : "Topic"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}