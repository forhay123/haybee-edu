import React from 'react';
import { Card, CardHeader, CardTitle, CardContent  } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';
import { CountdownTimer } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import {
  Loader2, 
} from 'lucide-react';
import type { Assessment } from '../types/assessmentTypes';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';


interface PreviousPeriodReviewPanelProps {
  submissionId: number;
  onSelectQuestion?: (questionId: number) => void;
  selectedQuestions?: number[];
}

export const PreviousPeriodReviewPanel: React.FC<PreviousPeriodReviewPanelProps> = ({
  submissionId,
  onSelectQuestion,
  selectedQuestions = []
}) => {
  const { analysis, incorrectQuestions, weakTopics, isLoading } = useSubmissionAnalysis({
    submissionId,
    enabled: !!submissionId
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analysis?.scorePercentage}%
              </div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {analysis?.correctCount}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {analysis?.incorrectCount}
              </div>
              <div className="text-sm text-gray-600">Incorrect</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Weak Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weakTopics.map((topic) => (
              <div key={topic.topicName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium">{topic.topicName}</div>
                  <div className="text-sm text-gray-600">
                    {topic.questionsWrong} of {topic.questionsTotal} incorrect
                  </div>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {topic.successRate.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incorrect Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Questions to Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incorrectQuestions.map((question) => (
              <div 
                key={question.questionId}
                className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                  selectedQuestions.includes(question.questionId)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => onSelectQuestion?.(question.questionId)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.questionId)}
                    onChange={() => onSelectQuestion?.(question.questionId)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium mb-1">{question.questionText}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Topic: {question.topic}</span>
                      <span>Difficulty: {question.difficulty}</span>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        Incorrect
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};