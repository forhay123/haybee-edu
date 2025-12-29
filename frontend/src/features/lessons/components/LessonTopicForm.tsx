import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api/axios";
import { useLessonTopics } from "../hooks/useLessonTopics";
import { useAuth } from "../../auth/useAuth";

interface LessonTopicFormProps {
  onSuccess?: () => void;
  onFiltersChanged?: (classId: number | null, subjectId: number | null, termId: number | null) => void;
}

const MAX_FILE_SIZE_MB = 10;

const LessonTopicForm: React.FC<LessonTopicFormProps> = ({ onSuccess, onFiltersChanged }) => {
  const { user } = useAuth();
  const isTeacher = user?.roles?.includes("TEACHER");
  
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [allTeacherSubjects, setAllTeacherSubjects] = useState<{ id: number; name: string }[]>([]);
  const [classSubjects, setClassSubjects] = useState<{ id: number; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: number; name: string }[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);

  const [topicTitle, setTopicTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [isAspirantMaterial, setIsAspirantMaterial] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const { create } = useLessonTopics(selectedSubjectId || undefined);

  // ✅ Load teacher's classes and subjects, or all classes for admin
  useEffect(() => {
    const fetchData = async () => {
      setLoadingClasses(true);
      try {
        const [classesRes, termsRes, subjectsRes] = await Promise.all([
          isTeacher 
            ? api.get("/classes/teacher/my-classes")
            : api.get("/classes"),
          api.get("/terms"),
          isTeacher 
            ? api.get("/subjects/teacher/my-subjects")
            : Promise.resolve({ data: [] }),
        ]);
        
        setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
        setTerms(Array.isArray(termsRes.data) ? termsRes.data : []);
        
        if (isTeacher) {
          setAllTeacherSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchData();
  }, [isTeacher]);

  // ✅ Load subjects when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setClassSubjects([]);
      setSelectedSubjectId(null);
      return;
    }

    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await api.get(`/subjects/class/${selectedClassId}`);
        const subjectsData = Array.isArray(res.data) ? res.data : [];
        setClassSubjects(subjectsData);
        
        // Auto-select first available subject if none selected
        if (subjectsData.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subjectsData[0].id);
        } else if (subjectsData.length === 0) {
          setSelectedSubjectId(null);
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setClassSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [selectedClassId]);

  // ✅ Filter subjects to show only those the teacher teaches AND are in the selected class
  const filteredSubjects = useMemo(() => {
    if (!selectedClassId || !classSubjects) return [];
    
    // For admin, show all class subjects
    if (!isTeacher) return classSubjects;
    
    // For teacher, filter to only their subjects
    const teacherSubjectIds = new Set(allTeacherSubjects.map(s => s.id));
    return classSubjects.filter(subject => teacherSubjectIds.has(subject.id));
  }, [selectedClassId, classSubjects, allTeacherSubjects, isTeacher]);

  useEffect(() => {
    onFiltersChanged?.(selectedClassId, selectedSubjectId, selectedTermId);
  }, [selectedClassId, selectedSubjectId, selectedTermId, onFiltersChanged]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const sizeMB = selectedFile.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        setFileError(`❌ File exceeds ${MAX_FILE_SIZE_MB} MB limit`);
        setFile(null);
        return;
      }
    }
    setFile(selectedFile);
    setFileError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !selectedTermId) {
      alert("⚠️ Please select both Subject and Term");
      return;
    }
    if (fileError) return;

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob(
        [
          JSON.stringify({
            topicTitle,
            description,
            weekNumber,
            subjectId: selectedSubjectId,
            termId: selectedTermId,
            isAspirantMaterial,
          }),
        ],
        { type: "application/json" }
      )
    );
    if (file) formData.append("file", file);

    create.mutate(formData, {
      onSuccess: () => {
        alert("✅ Lesson uploaded successfully!");
        onSuccess?.();
        setTopicTitle("");
        setDescription("");
        setWeekNumber(1);
        setFile(null);
        setFileError(null);
        setIsAspirantMaterial(false);
      },
      onError: (err: any) => {
        console.error(err);
        alert(`❌ Upload failed: ${err.response?.data?.message || err.message || "Unknown error"}`);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          1️⃣ Select Class 
          {selectedClassId && <span className="text-green-600 ml-2">✓</span>}
          <span className="text-red-500 ml-1">*</span>
          {isTeacher && <span className="text-blue-600 ml-2 text-xs">(Your classes only)</span>}
        </label>
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => {
            setSelectedClassId(Number(e.target.value) || null);
            setSelectedSubjectId(null);
          }}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          required
          disabled={loadingClasses}
        >
          <option value="">
            {loadingClasses ? "Loading classes..." : "Choose a class..."}
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {!loadingClasses && classes.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {isTeacher 
              ? "⚠️ No classes assigned to you. Contact an administrator." 
              : "⚠️ No classes found"
            }
          </p>
        )}
      </div>

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          2️⃣ Select Subject
          {selectedSubjectId && <span className="text-green-600 ml-2">✓</span>}
          <span className="text-red-500 ml-1">*</span>
          {isTeacher && <span className="text-blue-600 ml-2 text-xs">(Your subjects in this class)</span>}
        </label>
        <select
          value={selectedSubjectId ?? ""}
          onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          disabled={!selectedClassId || loadingSubjects}
          required
        >
          <option value="">
            {!selectedClassId 
              ? "Select a class first..." 
              : loadingSubjects 
              ? "Loading subjects..."
              : "Choose a subject..."}
          </option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedClassId && !loadingSubjects && filteredSubjects.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {isTeacher 
              ? "⚠️ You don't teach any subjects in this class" 
              : "⚠️ No subjects found for this class"
            }
          </p>
        )}
      </div>

      {/* Term Selection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          3️⃣ Select Term
          {selectedTermId && <span className="text-green-600 ml-2">✓</span>}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={selectedTermId ?? ""}
          onChange={(e) => setSelectedTermId(Number(e.target.value) || null)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
          required
        >
          <option value="">Choose a term...</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
          4️⃣ Lesson Details
        </label>
        
        <div className="mb-3">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Topic Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Introduction to Algebra"
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            disabled={!selectedSubjectId}
            required
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Description (Optional)
          </label>
          <textarea
            placeholder="Brief description of the lesson..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            rows={2}
            disabled={!selectedSubjectId}
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Week Number <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            placeholder="1-52"
            value={weekNumber}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            min={1}
            max={52}
            disabled={!selectedSubjectId}
            required
          />
        </div>

        <label className="flex items-center mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAspirantMaterial}
            onChange={(e) => setIsAspirantMaterial(e.target.checked)}
            className="mr-2 h-4 w-4"
            disabled={!selectedSubjectId}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            🎯 Mark as Aspirant Material
          </span>
        </label>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            📎 Upload Material (PDF, max {MAX_FILE_SIZE_MB}MB)
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
            disabled={!selectedSubjectId}
          />
          {fileError && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{fileError}</p>}
          {file && !fileError && (
            <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center gap-1">
              <span>✅</span>
              <span>{file.name}</span>
              <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={create.isPending || !selectedSubjectId || !selectedTermId || !!fileError}
        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
      >
        {create.isPending ? "⏳ Uploading..." : "✅ Upload Lesson"}
      </button>
    </div>
  );
};

export default LessonTopicForm;