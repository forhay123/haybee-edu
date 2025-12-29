import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '@/store/store';
import { useCreateSession } from '../hooks/useLiveSessions';
import toast from 'react-hot-toast';

// ✅ Import hooks for dynamic data
import { 
  useTeacherSubjects,
  useGetSubjects 
} from '@/features/subjects/hooks/useSubjects';
import { useGetClasses } from '@/features/classes/api/classesApi';
import { useGetTerms } from '@/features/terms/api/termsApi';
import { useLessonTopics } from '@/features/lessons/hooks/useLessonTopics';
import { LessonTopicDto } from '@/features/lessons/types/lessonTopicTypes';

interface SessionFormData {
  title: string;
  description: string;
  subjectId: number;
  lessonTopicId: number | null;
  classId: number;
  termId: number;
  scheduledStartTime: string;
  scheduledDurationMinutes: number;
  maxParticipants: number;
}


interface Term {
  id: number;
  name: string;
}

export const CreateSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth?.user);
  const userRoles = user?.roles || [];
  const isTeacher = userRoles.includes('TEACHER');
  const isAdmin = userRoles.includes('ADMIN');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<SessionFormData>(() => {
    const saved = localStorage.getItem('sessionDraft');
    return saved ? JSON.parse(saved) : {
      title: '',
      description: '',
      subjectId: 0,
      lessonTopicId: null,
      classId: 0,
      termId: 0,
      scheduledStartTime: '',
      scheduledDurationMinutes: 60,
      maxParticipants: 100,
    };
  });

  // ✅ Fetch dynamic data
  const { data: teacherSubjects, isLoading: isLoadingSubjects } = useTeacherSubjects();
  const { data: allSubjects, isLoading: isLoadingAllSubjects } = useGetSubjects();
  const { data: classes, isLoading: isLoadingClasses } = useGetClasses();
  const { data: terms, isLoading: isLoadingTerms } = useGetTerms();
  
  // ✅ Fetch lesson topics for selected subject
    const { getAll: { data: lessonTopics, isLoading: isLoadingTopics } } = useLessonTopics(
    formData.subjectId > 0 ? formData.subjectId : undefined
    );

  // ✅ Determine which subjects to show
  const subjects = useMemo(() => {
    if (isAdmin) {
      return allSubjects || [];
    }
    return teacherSubjects || [];
  }, [isAdmin, teacherSubjects, allSubjects]);

  const createSessionMutation = useCreateSession();

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('sessionDraft', JSON.stringify(formData));
    }, 500);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (field: keyof SessionFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Reset lesson topic if subject changes
      if (field === 'subjectId') {
        updated.lessonTopicId = null;
      }
      
      return updated;
    });
  };

  const handleNext = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.subjectId || !formData.classId || !formData.termId) {
        toast.error('Please select subject, class, and term');
        return;
      }
    } else if (step === 2) {
      if (!formData.scheduledStartTime) {
        toast.error('Please select date and time');
        return;
      }
      // Check if time is in the future
      if (new Date(formData.scheduledStartTime) <= new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    } else if (step === 3) {
      if (!formData.title.trim()) {
        toast.error('Please enter a session title');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      // Convert datetime-local to ISO string
      const startTime = new Date(formData.scheduledStartTime).toISOString();
      
      await createSessionMutation.mutateAsync({
        ...formData,
        scheduledStartTime: startTime,
        lessonTopicId: formData.lessonTopicId || undefined,
      });
      
      // Clear draft
      localStorage.removeItem('sessionDraft');
      
      toast.success('Session created successfully!');
      navigate('/live-sessions');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('sessionDraft');
    setFormData({
      title: '',
      description: '',
      subjectId: 0,
      lessonTopicId: null,
      classId: 0,
      termId: 0,
      scheduledStartTime: '',
      scheduledDurationMinutes: 60,
      maxParticipants: 100,
    });
    setStep(1);
  };

  // Get selected items for review
  const selectedSubject = subjects.find(s => s.id === formData.subjectId);
  const selectedClass = classes?.find(c => c.id === formData.classId);
  const selectedTerm = terms?.find(t => t.id === formData.termId);
  const selectedTopic = lessonTopics?.find((t: LessonTopicDto) => t.id === formData.lessonTopicId);

  const isLoading = isLoadingSubjects || isLoadingAllSubjects || isLoadingClasses || isLoadingTerms;

  if (!isTeacher && !isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Access Denied</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            Only teachers and administrators can create live sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Live Session</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Set up a new live class session</p>
        </div>
        <button
          onClick={clearDraft}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Clear Draft
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span>Subject & Lesson</span>
          <span>Schedule</span>
          <span>Details</span>
          <span>Review</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Step 1: Subject & Lesson */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Subject & Lesson</h2>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading options...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject * <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => handleChange('subjectId', Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={0}>Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} {subject.code && `(${subject.code})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => handleChange('classId', Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={0}>Select a class</option>
                    {classes?.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Term <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.termId}
                    onChange={(e) => handleChange('termId', Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value={0}>Select a term</option>
                    {terms?.map((t: Term) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lesson Topic (Optional)
                  </label>
                  {formData.subjectId === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      Select a subject first to see lesson topics
                    </p>
                  ) : isLoadingTopics ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading topics...</p>
                  ) : (
                    <select
                      value={formData.lessonTopicId || ''}
                      onChange={(e) => handleChange('lessonTopicId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">No specific topic</option>
                      {lessonTopics?.map((topic: LessonTopicDto) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.topicTitle}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Session</h2>
            
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledStartTime}
                onChange={(e) => handleChange('scheduledStartTime', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select when the session should start
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.scheduledDurationMinutes}
                onChange={(e) => handleChange('scheduledDurationMinutes', Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Participants
              </label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleChange('maxParticipants', Number(e.target.value))}
                min={1}
                max={500}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum number of students who can join (default: 100)
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Details</h2>
            
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Introduction to Algebra"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What will students learn in this session?"
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review & Create</h2>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedSubject?.name || 'Not selected'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Class</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedClass?.name || 'Not selected'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Term</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedTerm?.name || 'Not selected'}
                </p>
              </div>
              
              {selectedTopic && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lesson Topic</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTopic.topicTitle}
                  </p>
                </div>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.scheduledStartTime 
                    ? new Date(formData.scheduledStartTime).toLocaleString()
                    : 'Not set'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.scheduledDurationMinutes} minutes
                </p>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Title</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formData.title || 'No title'}
                </p>
              </div>
              
              {formData.description && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            onClick={handlePrev}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
          >
            ← Previous
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createSessionMutation.isPending}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {createSessionMutation.isPending ? 'Creating...' : '✓ Create Session'}
          </button>
        )}
      </div>
    </div>
  );
};