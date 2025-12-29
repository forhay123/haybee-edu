// frontend/src/features/individual/components/SchemeUpload.tsx

import React, { useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle, BookOpen } from "lucide-react";
import { useFileUpload } from "../hooks/useFileUpload";
import { formatFileSize, getStatusColor } from "../types/individualTypes";
import { useQuery } from "@tanstack/react-query";
import { schemeApi } from "../api/individualApi";
import axios from "../../../api/axios"; // ✅ Import axios

interface SchemeUploadProps {
  studentProfileId: number;
}

// ✅ Subject DTO type
interface SubjectDto {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

const SchemeUpload: React.FC<SchemeUploadProps> = ({ studentProfileId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadScheme, progress, isUploading } = useFileUpload();
  
  // ✅ Fetch uploaded schemes
  const { data: schemes, isLoading: schemesLoading } = useQuery({
    queryKey: ["individual-schemes", studentProfileId],
    queryFn: () => schemeApi.getByStudent(studentProfileId),
  });

  // ✅ Fetch available subjects from API
  const { data: subjects, isLoading: subjectsLoading } = useQuery<SubjectDto[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await axios.get("/subjects");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSubjectId) return;
    
    try {
      await uploadScheme.mutateAsync({
        file: selectedFile,
        request: {
          studentProfileId,
          subjectId: selectedSubjectId,
        },
      });
      setSelectedFile(null);
      setSelectedSubjectId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canUpload = selectedFile && selectedSubjectId && !isUploading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Scheme of Work</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload schemes of work for each subject to track your lesson topics and progress
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Subject
          </label>
          <select
            value={selectedSubjectId || ""}
            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isUploading || subjectsLoading}
          >
            <option value="">
              {subjectsLoading ? "Loading subjects..." : "Choose a subject..."}
            </option>
            {subjects?.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} {subject.code && `(${subject.code})`}
              </option>
            ))}
          </select>
          {subjectsLoading && (
            <p className="text-xs text-gray-500 mt-1">Fetching available subjects...</p>
          )}
          {!subjectsLoading && (!subjects || subjects.length === 0) && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  No subjects available. Please contact your administrator to set up subjects.
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 hover:border-indigo-400"
          } ${isUploading || !selectedSubjectId ? "opacity-50" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          
          {!selectedSubjectId ? (
            <div>
              <p className="text-gray-600 mb-2">Please select a subject first</p>
              <p className="text-xs text-gray-500">
                Choose which subject this scheme belongs to
              </p>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-lg p-4">
                <FileText className="w-8 h-8 text-indigo-600" />
                <div className="text-left flex-1">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} • {subjects?.find(s => s.id === selectedSubjectId)?.name}
                  </p>
                </div>
                {!isUploading && (
                  <button
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Uploading... {progress.percentage}%
                  </p>
                </div>
              )}

              {canUpload && (
                <button
                  onClick={handleUpload}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Upload Scheme
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag and drop your scheme here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
                disabled={!selectedSubjectId}
              >
                browse files
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, Word (.docx, .doc), Excel (.xlsx, .xls), Images
              </p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={isUploading || !selectedSubjectId}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Uploaded Schemes</h3>
        
        {schemesLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : !schemes || schemes.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No schemes uploaded yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Upload schemes of work to see your lesson topics
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <BookOpen className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {scheme.originalFilename}
                      </p>
                      <p className="text-sm font-semibold text-indigo-600">
                        {scheme.subjectName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(scheme.fileSizeBytes)} • {scheme.fileType}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded {new Date(scheme.uploadedAt).toLocaleDateString()}
                      </p>
                      
                      {scheme.processingStatus === "COMPLETED" && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          {scheme.totalTopicsExtracted && (
                            <span className="text-green-600">
                              {scheme.totalTopicsExtracted} topics extracted
                            </span>
                          )}
                          {scheme.weeksCovered && (
                            <span className="text-blue-600">
                              {scheme.weeksCovered} weeks
                            </span>
                          )}
                        </div>
                      )}
                      
                      {scheme.processingError && (
                        <div className="flex items-start gap-2 mt-2 text-xs text-red-600">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{scheme.processingError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      scheme.processingStatus
                    )}`}
                  >
                    {scheme.processingStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemeUpload;