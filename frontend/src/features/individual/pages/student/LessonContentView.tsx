import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Lightbulb,
  Target,
  ListChecks,
  BookMarked,
  Download,
  PlayCircle,
  Timer,
  Users,
  Loader2
} from "lucide-react";
import axios from "@/api/axios";
import { useMyWeeklySchedule } from "../../hooks/student/useMyWeeklySchedule";
import { useMyProfile } from "../../../studentProfiles/hooks/useStudentProfiles";
import { formatLearningTime } from "../../components/student/LearningHoursInfo";
import { calculateScheduleStatus } from "@/services/weeklyGenerationService";

// ============================================================
// TYPES
// ============================================================

interface LessonContent {
  id: number;
  subjectId: number;
  subjectName: string;
  termId: number;
  termName: string;
  weekNumber: number;
  topicTitle: string;
  title: string;
  description: string;
  fileUrl: string;
  questionCount: number;
  status: string;
  progress: number;
  createdAt: string | null;
  aspirantMaterial: boolean;
}

interface ScheduleData {
  id: number;
  studentProfileId: number;
  scheduledDate: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  lessonTopicId: number | null;
  lessonTopicTitle: string | null;
  completed: boolean;
  progressId: number;
  lessonContentAccessible: boolean;
  assessmentAccessible: boolean;
  assessmentWindowStart: string;
  assessmentWindowEnd: string;
  gracePeriodEnd: string;
}

type TabType = "overview" | "content" | "resources";

// ============================================================
// COMPONENT
// ============================================================

export default function LessonContentView() {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const { data: profile } = useMyProfile();
  const { useWeekSchedule } = useMyWeeklySchedule(profile?.id || 0);
  const termStartDate = new Date().toISOString().split('T')[0];
  const { data: weeklySchedule } = useWeekSchedule(termStartDate, !!profile?.id);

  // ============================================================
  // HELPER FUNCTION - FIXED: USE DATABASE URL DIRECTLY
  // ============================================================
  /**
   * Return the PDF URL from the database directly - no conversion needed!
   * The database already stores the full correct URL
   */
  const getPdfUrl = (fileUrl: string | undefined | null): string => {
    if (!fileUrl) return '';
    
    console.log('📄 Using database URL directly:', fileUrl);
    return fileUrl; // Database URL is already correct!
  };

  // ============================================================
  // FETCH SCHEDULE DATA - NO REMAPPING
  // ============================================================
  useEffect(() => {
    if (!progressId || !weeklySchedule?.schedules) {
      return;
    }

    const schedule = weeklySchedule.schedules.find(
      (s: any) => s.progressId === parseInt(progressId)
    );

    if (schedule) {
      console.log('✅ Found schedule from weekly data:', schedule);
      console.log('📍 Assessment Window:', schedule.assessmentWindowStart, 'to', schedule.assessmentWindowEnd);
      console.log('📍 Current Time:', new Date().toISOString());
      
      setScheduleData(schedule);
      
      if (schedule.lessonTopicId) {
        fetchLessonContent(schedule.lessonTopicId);
      } else {
        setLoading(false);
      }
    } else {
      setError("Schedule not found");
      setLoading(false);
    }
  }, [progressId, weeklySchedule]);

  const fetchLessonContent = async (topicId: number) => {
    try {
      console.log(`🔍 Fetching lesson content for topicId: ${topicId}`);
      const res = await axios.get<LessonContent>(`/lesson-topics/${topicId}`);
      console.log('✅ Lesson content:', res.data);
      setLessonContent(res.data);
    } catch (err: any) {
      console.error("⚠️ Failed to fetch lesson content:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CALCULATE STATUS USING ACTUAL DATABASE TIMES
  // ============================================================
  const currentStatus = useMemo(() => {
    if (!scheduleData) return null;
    return calculateScheduleStatus(scheduleData);
  }, [scheduleData]);

  const handleStartAssessment = () => {
    if (!progressId) return;
    navigate(`/student/individual/assessment/start/${progressId}`);
  };

  const handleBack = () => {
    navigate("/individual/week-schedule");
  };

  // ============================================================
  // LOADING STATES
  // ============================================================
  if (loading || !profile || !weeklySchedule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-gray-600">Loading lesson content...</p>
        </div>
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Lesson content not found"}
          </AlertDescription>
        </Alert>
        <Button onClick={handleBack} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Schedule
        </Button>
      </div>
    );
  }

  // ============================================================
  // NO TOPIC ASSIGNED
  // ============================================================
  if (!scheduleData.lessonTopicId || !scheduleData.lessonTopicTitle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schedule
          </Button>

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg overflow-hidden">
            <div className="p-8 text-white">
              <div className="flex items-center gap-2 mb-3 opacity-90">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">{scheduleData.subjectName}</span>
                <span className="text-sm opacity-75">({scheduleData.subjectCode})</span>
              </div>
              <h1 className="text-4xl font-bold mb-4">Lesson Topic Pending</h1>
              <p className="text-indigo-100 text-lg mb-6 max-w-3xl">
                Your teacher is working on assigning a topic for this lesson. Check back soon!
              </p>
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(scheduleData.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Period {scheduleData.periodNumber} • {formatLearningTime(scheduleData.startTime)} - {formatLearningTime(scheduleData.endTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <h4 className="font-semibold mb-2">Topic Assignment Pending</h4>
              <p className="text-sm mb-3">
                Your teacher needs to assign a lesson topic for this period. Once assigned, you'll be able to:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• View the lesson materials and study content</li>
                <li>• Access AI-generated practice questions</li>
                <li>• Complete your assessment during the scheduled time</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // ============================================================
  // CALCULATE TIME-BASED AVAILABILITY
  // ============================================================
  const now = new Date();
  const assessmentStart = new Date(scheduleData.assessmentWindowStart);
  const assessmentEnd = new Date(scheduleData.assessmentWindowEnd);
  
  const isAssessmentAvailable = currentStatus === 'AVAILABLE';
  const isCompleted = scheduleData.completed;
  const isUpcoming = now < assessmentStart;
  const isMissed = currentStatus === 'MISSED';

  console.log('🔍 Status Check:', {
    currentStatus,
    isAssessmentAvailable,
    isCompleted,
    isUpcoming,
    isMissed,
    now: now.toISOString(),
    assessmentStart: assessmentStart.toISOString(),
    assessmentEnd: assessmentEnd.toISOString()
  });

  // ============================================================
  // CALCULATE DURATION
  // ============================================================
  const calculateDuration = (startTime: string, endTime: string) => {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      return diffMinutes;
    } catch {
      return 60;
    }
  };

  const duration = calculateDuration(scheduleData.startTime, scheduleData.endTime);
  const lessonTitle = scheduleData.lessonTopicTitle || "Lesson Topic";

  const objectives = [
    `Understand the key concepts of ${lessonTitle}`,
    `Apply learned principles to solve related problems`,
    `Demonstrate mastery through assessment completion`
  ];

  const topics = [
    {
      title: "Introduction",
      description: `Overview of ${lessonTitle}`,
      duration: "10 min"
    },
    {
      title: "Core Concepts",
      description: "Main ideas and principles",
      duration: "15 min"
    },
    {
      title: "Examples",
      description: "Practical applications",
      duration: "15 min"
    },
    {
      title: "Practice",
      description: "Exercises and review",
      duration: "10 min"
    }
  ];

  const prerequisites = [
    "Basic understanding of previous topics",
    "Completed prerequisite lessons"
  ];

  const resources = lessonContent?.fileUrl ? [
    {
      type: "PDF",
      title: `${lessonContent.title || lessonTitle} - Study Material`,
      url: lessonContent.fileUrl,
      size: ""
    }
  ] : [];

  // ============================================================
  // FORMAT TIME REMAINING
  // ============================================================
  const formatTimeUntilStart = () => {
    const diffMs = assessmentStart.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schedule
          </Button>

          {isCompleted && (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
          {isMissed && (
            <Badge className="bg-red-100 text-red-700 border-red-300">
              Missed
            </Badge>
          )}
        </div>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg overflow-hidden">
          <div className="p-8 text-white">
            <div className="flex items-center gap-2 mb-3 opacity-90">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">{scheduleData.subjectName}</span>
              <span className="text-sm opacity-75">({scheduleData.subjectCode})</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">{lessonTitle}</h1>
            <p className="text-indigo-100 text-lg mb-6 max-w-3xl">
              {lessonContent?.description || `Comprehensive lesson covering ${lessonTitle}`}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(scheduleData.scheduledDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Period {scheduleData.periodNumber} • {formatLearningTime(scheduleData.startTime)} - {formatLearningTime(scheduleData.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span>{duration} minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Status Alerts */}
        {isAssessmentAvailable && !isCompleted && (
          <Card className="border-blue-200 bg-blue-50 shadow-md animate-pulse">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 text-lg mb-1">
                    🚀 Assessment Available NOW!
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Your assessment window is currently open. Review the lesson content below, then start your assessment when ready.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleStartAssessment}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start Assessment Now
                    </Button>
                    <span className="text-sm text-blue-700">
                      Window closes at {formatLearningTime(scheduleData.endTime)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isUpcoming && !isCompleted && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 mb-1">
                    Assessment Opens Soon
                  </h4>
                  <p className="text-sm text-amber-700">
                    Assessment window opens in <strong>{formatTimeUntilStart()}</strong> at{" "}
                    <strong>{formatLearningTime(scheduleData.startTime)}</strong>
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    Use this time to study the lesson content below and prepare for your assessment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isMissed && !isCompleted && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">
                    Assessment Window Closed
                  </h4>
                  <p className="text-sm text-red-700">
                    The assessment window closed at <strong>{formatLearningTime(scheduleData.endTime)}</strong>.
                    You can still review the lesson content below.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Contact your teacher if you need to arrange a makeup assessment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b">
            <div className="flex gap-1 p-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                  activeTab === "overview"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Target className="h-4 w-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("content")}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                  activeTab === "content"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookMarked className="h-4 w-4 inline mr-2" />
                Lesson Content
              </button>
              <button
                onClick={() => setActiveTab("resources")}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
                  activeTab === "resources"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Resources
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    Learning Objectives
                  </h3>
                  <div className="grid gap-3">
                    {objectives.map((objective, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700">{objective}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-indigo-600" />
                    Key Topics Covered
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {topics.map((topic, idx) => (
                      <Card key={idx} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{topic.title}</h4>
                            {topic.duration && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                {topic.duration}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{topic.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-indigo-600" />
                      Prerequisites
                    </h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800 mb-3">
                        Make sure you're familiar with these concepts:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {prerequisites.map((prereq, idx) => (
                          <span key={idx} className="bg-white border border-amber-300 text-amber-900 px-3 py-1 rounded-full text-sm">
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "content" && (
              <div className="space-y-6">
                {lessonContent?.fileUrl && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      Lesson Material
                    </h3>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-lg">
                              <FileText className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{lessonContent.title}</h4>
                              <p className="text-sm text-gray-600">
                                {lessonContent.description} • Week {lessonContent.weekNumber} • {lessonContent.questionCount} questions
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(getPdfUrl(lessonContent.fileUrl), '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Open PDF
                          </Button>
                        </div>
                        
                        <div className="aspect-[8.5/11] bg-gray-100 rounded-lg overflow-hidden border">
                          <iframe
                            src={getPdfUrl(lessonContent.fileUrl)}
                            className="w-full h-full"
                            title="Lesson Material PDF"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-indigo-600" />
                    Study Guide
                  </h3>
                  <div className="prose max-w-none bg-white p-6 rounded-lg border">
                    <h4 className="text-lg font-semibold mb-3">How to Study This Topic</h4>
                    <ol className="space-y-3">
                      <li>
                        <strong>Review the Material:</strong> Read through the entire lesson document carefully, 
                        taking notes on key concepts and terms.
                      </li>
                      <li>
                        <strong>Identify Key Points:</strong> Look for main ideas, definitions, formulas, 
                        and important examples in the material.
                      </li>
                      <li>
                        <strong>Practice Problems:</strong> If there are practice questions in the material, 
                        work through them to test your understanding.
                      </li>
                      <li>
                        <strong>Summarize:</strong> Write a brief summary in your own words of what you learned 
                        from this topic.
                      </li>
                    </ol>

                    {lessonContent && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-blue-900 mb-2">Topic Information</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• <strong>Subject:</strong> {lessonContent.subjectName}</li>
                          <li>• <strong>Term:</strong> {lessonContent.termName}</li>
                          <li>• <strong>Week:</strong> Week {lessonContent.weekNumber}</li>
                          <li>• <strong>Questions Available:</strong> {lessonContent.questionCount} AI-generated questions</li>
                          <li>• <strong>Status:</strong> <span className="capitalize">{lessonContent.status}</span></li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Prepare for Assessment
                  </h4>
                  <p className="text-purple-800 text-sm mb-3">
                    Review the key concepts and make sure you understand the material before starting your assessment.
                  </p>
                  <ul className="space-y-2 text-sm text-purple-900">
                    <li>• Review all learning objectives listed above</li>
                    <li>• Take notes on key concepts and formulas</li>
                    <li>• Try explaining the concepts in your own words</li>
                    <li>• Ensure you understand how to apply what you've learned</li>
                    {lessonContent?.questionCount && (
                      <li>• Practice with the {lessonContent.questionCount} AI-generated questions available</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "resources" && (
              <div className="space-y-6">
                {resources.length > 0 ? (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Download className="h-5 w-5 text-indigo-600" />
                      Downloadable Resources
                    </h3>
                    <div className="grid gap-4">
                      {resources.map((resource, idx) => (
                        <Card key={idx} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-lg">
                                  <FileText className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    {resource.type} document{resource.size && ` • ${resource.size}`}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(getPdfUrl(resource.url), '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      No additional resources available
                    </p>
                    <p className="text-sm text-gray-500">
                      Focus on the lesson content and objectives above.
                    </p>
                  </div>
                )}

                {/* Study Tips Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Study Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Create a Study Schedule</h4>
                        <p className="text-sm text-gray-600">
                          Break down the material into manageable sections and study consistently.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookMarked className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Take Effective Notes</h4>
                        <p className="text-sm text-gray-600">
                          Write down key concepts, definitions, and examples in your own words.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Practice Regularly</h4>
                        <p className="text-sm text-gray-600">
                          Test yourself with practice questions to reinforce your understanding.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action */}
        {isAssessmentAvailable && !isCompleted && (
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    Ready to test your knowledge?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Complete the assessment to demonstrate your understanding of this lesson.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleStartAssessment}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlayCircle className="h-5 w-5 mr-2" />
                  Start Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}