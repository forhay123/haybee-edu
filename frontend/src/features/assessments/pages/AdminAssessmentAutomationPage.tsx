// frontend/src/features/assessments/pages/AdminAssessmentAutomationPage.tsx

import React, { useState } from 'react';
import { useAssessmentAutomation } from '../hooks/useAssessmentAutomation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  FileText, 
  BookOpen,
  Loader2,
  AlertTriangle
} from 'lucide-react';

export const AdminAssessmentAutomationPage: React.FC = () => {
  const {
    missingStats,
    selectedTopics,
    selectedCount,
    hasSelection,
    allSelected,
    isLoadingStats,
    isCreating,
    isCreatingSingle,
    isCreatingAll,
    isCreatingBulk,
    statsError,
    createError,
    createForTopic,
    createAllMissing,
    createForSelected,
    refetchStats,
    toggleTopicSelection,
    selectAllTopics,
    clearSelection,
    isTopicSelected,
  } = useAssessmentAutomation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  const handleCreateAll = async () => {
    try {
      setSuccessMessage(null);
      setCreatedCount(null);
      const result = await createAllMissing();
      setCreatedCount(result.assessmentsCreated);
      setSuccessMessage(
        `Successfully created ${result.assessmentsCreated} assessments!`
      );
    } catch (error: any) {
      console.error('Failed to create all assessments:', error);
    }
  };

  const handleCreateSelected = async () => {
    try {
      setSuccessMessage(null);
      setCreatedCount(null);
      const result = await createForSelected();
      setCreatedCount(result.assessmentsCreated);
      setSuccessMessage(
        `Successfully created ${result.assessmentsCreated} assessments!`
      );
    } catch (error: any) {
      console.error('Failed to create selected assessments:', error);
    }
  };

  const handleCreateSingle = async (topicId: number, topicTitle: string) => {
    try {
      setSuccessMessage(null);
      setCreatedCount(null);
      await createForTopic(topicId);
      setSuccessMessage(`Successfully created assessment for "${topicTitle}"!`);
      setCreatedCount(1);
    } catch (error: any) {
      console.error(`Failed to create assessment for topic ${topicId}:`, error);
    }
  };

  if (isLoadingStats) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">Loading assessment data...</span>
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load missing assessments: {statsError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const missingCount = missingStats?.missingCount ?? 0;
  const topics = missingStats?.topics ?? [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessment Automation</h1>
          <p className="text-gray-600 mt-1">
            Automatically create assessments for lesson topics with AI-generated questions
          </p>
        </div>
        <Button onClick={() => refetchStats()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && createdCount !== null && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {createError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {createError.message || 'Failed to create assessments'}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Assessments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{missingCount}</div>
            <p className="text-xs text-muted-foreground">
              Topics with questions but no assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topics.reduce((sum, t) => sum + t.questionCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              AI-generated questions ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topics.reduce((sum, t) => sum + t.totalMarks, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined assessment value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      {missingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Create assessments for multiple topics at once
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleCreateAll}
                disabled={isCreating || missingCount === 0}
                className="flex-1"
              >
                {isCreatingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating All...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create All {missingCount} Assessments
                  </>
                )}
              </Button>

              <Button
                onClick={hasSelection ? handleCreateSelected : selectAllTopics}
                disabled={isCreating || missingCount === 0}
                variant={hasSelection ? 'default' : 'outline'}
                className="flex-1"
              >
                {isCreatingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Selected...
                  </>
                ) : hasSelection ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create {selectedCount} Selected
                  </>
                ) : (
                  <>
                    <Checkbox checked={false} className="mr-2" />
                    Select Topics
                  </>
                )}
              </Button>
            </div>

            {hasSelection && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedCount} topic{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Topics List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Missing Assessments</CardTitle>
              <CardDescription>
                {missingCount === 0
                  ? 'All topics with AI questions have assessments! 🎉'
                  : `${missingCount} topic${missingCount !== 1 ? 's' : ''} need${missingCount === 1 ? 's' : ''} assessments`}
              </CardDescription>
            </div>
            {topics.length > 0 && (
              <Button
                onClick={allSelected ? clearSelection : selectAllTopics}
                variant="outline"
                size="sm"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700">
                All assessments are up to date!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Every lesson topic with AI questions has an assessment created.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic.lessonTopicId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={isTopicSelected(topic.lessonTopicId)}
                      onCheckedChange={() =>
                        toggleTopicSelection(topic.lessonTopicId)
                      }
                      disabled={isCreating}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {topic.topicTitle}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {topic.subjectName}
                      </p>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">
                          {topic.questionCount}
                        </div>
                        <div className="text-gray-500">Questions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">
                          {topic.totalMarks}
                        </div>
                        <div className="text-gray-500">Marks</div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      handleCreateSingle(topic.lessonTopicId, topic.topicTitle)
                    }
                    disabled={isCreating}
                    size="sm"
                    variant="outline"
                    className="ml-4"
                  >
                    {isCreatingSingle ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-900">
                How Assessment Automation Works
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Topics with AI-generated questions but no assessment are detected</li>
                <li>Assessments are created automatically with all questions included</li>
                <li>Passing marks set to 50%, duration set to 45 minutes</li>
                <li>Assessments are published and ready for students immediately</li>
                <li>A scheduled task runs hourly to catch new topics automatically</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};