// frontend/src/features/individual/components/student/TimetableDeleteConfirmation.tsx

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, FileText, Trash2, Shield } from "lucide-react";
import type { DeletionImpactInfo } from "../../types/archiveTypes";

interface TimetableDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (preserveCompleted: boolean, reason?: string) => void;
  timetableName: string;
  deletionImpact?: DeletionImpactInfo;
  isDeleting?: boolean;
}

export function TimetableDeleteConfirmation({
  open,
  onOpenChange,
  onConfirm,
  timetableName,
  deletionImpact,
  isDeleting = false,
}: TimetableDeleteConfirmationProps) {
  const [preserveCompleted, setPreserveCompleted] = useState(true);
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    onConfirm(preserveCompleted, deletionReason || undefined);
    // Reset state
    setConfirmText("");
    setDeletionReason("");
    setPreserveCompleted(true);
  };

  const isConfirmDisabled = confirmText.trim().toLowerCase() !== "delete";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Timetable
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You are about to delete the following timetable:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Timetable Name */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{timetableName}</span>
          </div>

          {/* Critical Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">This action cannot be undone!</span> Deleting this
              timetable will permanently remove it from the system.
            </AlertDescription>
          </Alert>

          {/* Deletion Impact */}
          {deletionImpact && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="font-semibold text-sm">What will be deleted:</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Schedules:</span>
                  <span className="font-semibold">{deletionImpact.currentSchedulesCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Future Schedules:</span>
                  <span className="font-semibold">{deletionImpact.futureSchedulesCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pending Assessments:</span>
                  <span className="font-semibold text-yellow-600">
                    {deletionImpact.pendingAssessmentsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed Assessments:</span>
                  <span className="font-semibold text-green-600">
                    {deletionImpact.completedAssessmentsCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preserve Completed Option */}
          {deletionImpact && deletionImpact.completedAssessmentsCount > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="font-semibold text-green-700 mb-1">
                      Protect Your Progress
                    </div>
                    <div className="text-sm text-green-700/80">
                      You have completed {deletionImpact.completedAssessmentsCount} assessment
                      {deletionImpact.completedAssessmentsCount !== 1 ? "s" : ""}. We recommend
                      preserving your completed work.
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preserve"
                      checked={preserveCompleted}
                      onChange={(e) => setPreserveCompleted(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="preserve" className="text-sm font-medium cursor-pointer">
                      Preserve completed assessments and scores
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for deletion (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Uploaded wrong file, need to update timetable..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm font-medium">
              Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm
            </Label>
            <input
              id="confirm"
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Type DELETE to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Timetable
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}