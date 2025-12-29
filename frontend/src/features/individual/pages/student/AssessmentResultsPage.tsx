// frontend/src/features/individual/pages/student/AssessmentResultsPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { formatLearningTime } from '../../components/student/LearningHoursInfo';

const AssessmentResultsPage: React.FC = () => {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultsData, setResultsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch results data
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await api.getProgressResults(progressId);
        // setResultsData(response.data);
        
        // Mock data
        const mockResults = {
          id: progressId,
          subjectName: "Mathematics SSS1 General Individual",
          lessonTopicTitle: "Quadratic Equations",
          periodSequence: 1,
          totalPeriodsInSequence: 3,
          scheduledDate: "2024-12-06",
          startTime: "12:00:00",
          endTime: "13:00:00",
          completedAt: new Date(Date.now() - 3600000).toISOString(),
          score: 85,
          maxScore: 100,
          grade: "A",
          totalQuestions: 20,
          correctAnswers: 17,
          feedback: "Excellent work! You have a strong understanding of quadratic equations."
        };
        
        setResultsData(mockResults);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load results');
        setLoading(false);
      }
    };

    fetchResults();
  }, [progressId]);

  const getGradeColor = (grade: string): string => {
    if (grade === 'A' || grade === 'A+') return 'text-green-600 bg-green-100';
    if (grade === 'B' || grade === 'B+') return 'text-blue-600 bg-blue-100';
    if (grade === 'C' || grade === 'C+') return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceMessage = (score: number): string => {
    if (score >= 90) return "Outstanding! 🌟";
    if (score >= 80) return "Excellent work! 🎉";
    if (score >= 70) return "Good job! 👍";
    if (score >= 60) return "Keep practicing! 📚";
    return "Need more review. Don't give up! 💪";
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !resultsData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Results not found'}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const scorePercentage = (resultsData.score / resultsData.maxScore) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/student/individual/schedule')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Award className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Assessment Results
            </h1>
            <p className="text-gray-600">{resultsData.lessonTopicTitle}</p>
            <p className="text-sm text-gray-500 mt-1">{resultsData.subjectName}</p>
          </div>
        </div>
      </div>

      {/* Score Card */}
      <Card className="mb-6 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-lg mb-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600">
                  {resultsData.score}
                </div>
                <div className="text-sm text-gray-600">out of {resultsData.maxScore}</div>
              </div>
            </div>
            <div className={`inline-block px-6 py-2 rounded-full font-bold text-2xl ${getGradeColor(resultsData.grade)} mb-3`}>
              Grade: {resultsData.grade}
            </div>
            <p className="text-xl font-semibold text-gray-800 mb-2">
              {getPerformanceMessage(scorePercentage)}
            </p>
            <Progress value={scorePercentage} className="h-3 mb-2" />
            <p className="text-sm text-gray-600">
              {scorePercentage.toFixed(1)}% Score
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resultsData.correctAnswers}/{resultsData.totalQuestions}
                </p>
                <p className="text-xs text-gray-500">Correct answers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((resultsData.correctAnswers / resultsData.totalQuestions) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="text-2xl font-bold text-gray-900">
                  {resultsData.periodSequence}/{resultsData.totalPeriodsInSequence}
                </p>
                <p className="text-xs text-gray-500">Assessment sequence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Subject:</span>
              <span className="font-medium">{resultsData.subjectName}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Topic:</span>
              <span className="font-medium">{resultsData.lessonTopicTitle}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Scheduled Time:</span>
              <span className="font-medium">
                {formatLearningTime(resultsData.startTime)} - {formatLearningTime(resultsData.endTime)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Completed At:</span>
              <span className="font-medium">
                {new Date(resultsData.completedAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Status:</span>
              <Badge variant="default" className="bg-green-100 text-green-700">
                ✓ Completed
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Card */}
      {resultsData.feedback && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Teacher's Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{resultsData.feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {resultsData.periodSequence < resultsData.totalPeriodsInSequence && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            This is period {resultsData.periodSequence} of {resultsData.totalPeriodsInSequence}. 
            Check your schedule for the next assessment period.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/student/individual/schedule')}
          className="flex-1"
        >
          Back to Schedule
        </Button>
        <Button
          onClick={() => navigate('/student/individual/progress')}
          className="flex-1"
        >
          View All Progress
        </Button>
      </div>
    </div>
  );
};

export default AssessmentResultsPage;