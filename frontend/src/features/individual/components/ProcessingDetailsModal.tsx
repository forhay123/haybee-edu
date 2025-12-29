// frontend/src/features/individual/components/ProcessingDetailsModal.tsx

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { IndividualTimetableDto } from "../types/individualTypes";

interface ProcessingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: IndividualTimetableDto;
}

export default function ProcessingDetailsModal({
  isOpen,
  onClose,
  timetable,
}: ProcessingDetailsModalProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case "PROCESSING":
        return <ClockIcon className="h-6 w-6 text-blue-500 animate-spin" />;
      case "FAILED":
        return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(timetable.processingStatus)}
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-gray-900"
                      >
                        {timetable.originalFilename}
                      </Dialog.Title>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          timetable.processingStatus
                        )}`}
                      >
                        {timetable.processingStatus}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Processing Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">
                      Total Periods
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {timetable.totalPeriodsExtracted || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">
                      Subjects Identified
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {timetable.subjectsIdentified || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">
                      Confidence Score
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {timetable.confidenceScore
                        ? `${(timetable.confidenceScore * 100).toFixed(0)}%`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* File Details */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    File Details
                  </h4>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">File Type</dt>
                      <dd className="font-medium text-gray-900">
                        {timetable.fileType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">File Size</dt>
                      <dd className="font-medium text-gray-900">
                        {(timetable.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Uploaded At</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(timetable.uploadedAt).toLocaleString()}
                      </dd>
                    </div>
                    {timetable.processedAt && (
                      <div>
                        <dt className="text-gray-500">Processed At</dt>
                        <dd className="font-medium text-gray-900">
                          {new Date(timetable.processedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {timetable.academicYear && (
                      <div>
                        <dt className="text-gray-500">Academic Year</dt>
                        <dd className="font-medium text-gray-900">
                          {timetable.academicYear}
                        </dd>
                      </div>
                    )}
                    {timetable.termName && (
                      <div>
                        <dt className="text-gray-500">Term</dt>
                        <dd className="font-medium text-gray-900">
                          {timetable.termName}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Error Message */}
                {timetable.processingError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      Processing Error
                    </h4>
                    <p className="text-sm text-red-700">
                      {timetable.processingError}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {timetable.fileUrl && (
                    <a
                      href={timetable.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Download File
                    </a>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}