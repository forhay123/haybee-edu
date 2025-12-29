// src/features/assessments/pages/TeacherLessonAssessmentPage.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreateLessonAssessmentForm from '../components/CreateLessonAssessmentForm';
import { ArrowLeft } from 'lucide-react';

const TeacherLessonAssessmentPage: React.FC = () => {
  const { lessonTopicId } = useParams<{ lessonTopicId: string }>();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <CreateLessonAssessmentForm
        lessonTopicId={Number(lessonTopicId)}
        onSuccess={() => navigate(-1)}
      />
    </div>
  );
};

export default TeacherLessonAssessmentPage;