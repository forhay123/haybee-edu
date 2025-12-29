import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../api/axios";
import { toast } from "react-hot-toast";
import { useMarkComplete } from "../../progress/hooks/useDailyPlanner";
import LessonAIQuestions from "../../lessons/components/LessonAIQuestions";

interface LessonTopic {
  id: number;
  subjectId: number;
  topicTitle: string;
  description?: string;
  fileUrl?: string;
  videoUrl?: string;
}

const StudentLessonTopicDetailPage: React.FC = () => {
  const { subjectId, lessonTopicId } = useParams<{ subjectId: string; lessonTopicId: string }>();
  const markCompleteMutation = useMarkComplete();

  // ✅ Fetch topic details
  const { data: topic, isLoading, isError } = useQuery<LessonTopic>({
    queryKey: ["lessonTopic", lessonTopicId],
    queryFn: async () => {
      const res = await api.get(`/lesson-topics/${lessonTopicId}`);
      return res.data;
    },
  });

  // ✅ Handle mark complete
  const handleMarkComplete = async () => {
    try {
      await markCompleteMutation.mutateAsync({
        lessonId: Number(lessonTopicId),
        scheduledDate: new Date().toISOString().split("T")[0],
        periodNumber: 1,
      });
      toast.success("✅ Lesson marked as complete!");
    } catch (err) {
      console.error("Mark complete failed:", err);
      toast.error("❌ Failed to record completion.");
    }
  };

  if (isLoading) return <p className="p-6">Loading lesson topic...</p>;
  if (isError) return <p className="p-6 text-red-500">Error loading lesson topic.</p>;
  if (!topic) return <p className="p-6">Lesson topic not found.</p>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* ✅ Lesson Header */}
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <h1 className="text-2xl font-bold mb-2">{topic.topicTitle}</h1>
        {topic.description && (
          <p className="text-muted-foreground mb-4">{topic.description}</p>
        )}

        {/* Lesson Material (PDF / File) */}
        {topic.fileUrl && (
          <a
            href={topic.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            📄 View Lesson Material
          </a>
        )}

        {/* Video (if available) */}
        {topic.videoUrl && (
          <div className="mt-6">
            <video
              controls
              className="rounded-lg shadow-md w-full max-h-[480px]"
            >
              <source src={topic.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* ✅ AI Questions Section */}
      <div className="bg-card p-6 rounded-lg shadow border border-border">
        <LessonAIQuestions subjectIds={[topic.subjectId]} />
      </div>

      {/* ✅ Mark Complete Button */}
      <div className="flex justify-end">
        <button
          onClick={handleMarkComplete}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Mark Lesson as Complete
        </button>
      </div>
    </div>
  );
};

export default StudentLessonTopicDetailPage;
