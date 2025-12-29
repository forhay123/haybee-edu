// frontend/src/features/individual/components/admin/BulkActionsToolbar.tsx

import React from "react";
import { Trash2, X, CheckCircle } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkDelete,
  isDeleting = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-900">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
          <span className="text-xs text-indigo-600">
            ({selectedCount} of {totalCount})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearSelection}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Selection
          </button>

          <button
            onClick={onBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "Deleting..." : `Delete ${selectedCount}`}
          </button>
        </div>
      </div>

      {selectedCount > 10 && (
        <div className="mt-3 flex items-start gap-2">
          <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-2">
            <p className="text-xs text-yellow-800">
              ⚠️ You're about to delete {selectedCount} timetables. This action cannot be undone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActionsToolbar;