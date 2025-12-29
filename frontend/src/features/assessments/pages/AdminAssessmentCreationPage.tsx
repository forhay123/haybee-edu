// frontend/src/features/assessments/pages/AdminAssessmentCreationPage.tsx

import React, { useEffect, useState } from "react";
import { useAdminAssessmentCreation } from "../hooks/useAdminAssessmentCreation";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Zap,
  BookOpen,
  FileText,
  TrendingUp,
  Settings
} from "lucide-react";

const AdminAssessmentCreationPage: React.FC = () => {
  const { 
    stats, 
    loading, 
    error, 
    fetchStats, 
    createForLesson, 
    createAllMissing 
  } = useAdminAssessmentCreation();

  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [processingAll, setProcessingAll] = useState(false);
  const [processingSingle, setProcessingSingle] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCreateAll = async () => {
    if (!confirm("Create assessments for ALL missing topics? This may take a few moments.")) {
      return;
    }

    setProcessingAll(true);
    setSuccessMessage(null);

    try {
      const result = await createAllMissing();
      
      if (result.success) {
        setSuccessMessage(
          `✅ Successfully created ${result.assessmentsCreated} assessments! ` +
          `(${result.skipped} topics already had assessments)`
        );
        setSelectedTopics(new Set());
      }
    } catch (err: any) {
      console.error("Failed to create all assessments:", err);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleCreateSingle = async (lessonTopicId: number) => {
    setProcessingSingle(lessonTopicId);
    setSuccessMessage(null);

    try {
      const result = await createForLesson(lessonTopicId);
      
      if (result.success) {
        if (result.created) {
          setSuccessMessage(
            `✅ Assessment created for topic ${lessonTopicId}!`
          );
        } else {
          setSuccessMessage(
            `ℹ️ Assessment already exists for topic ${lessonTopicId}`
          );
        }
      }
    } catch (err: any) {
      console.error("Failed to create assessment:", err);
    } finally {
      setProcessingSingle(null);
    }
  };

  const toggleTopicSelection = (topicId: number) => {
    const newSelection = new Set(selectedTopics);
    if (newSelection.has(topicId)) {
      newSelection.delete(topicId);
    } else {
      newSelection.add(topicId);
    }
    setSelectedTopics(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTopics.size === stats?.topics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(stats?.topics.map(t => t.lessonTopicId) || []));
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading assessment statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Assessment Auto-Creation
            </h1>
            <p className="text-gray-600 mt-2">
              Automatically create assessments for lesson topics with AI-generated questions
            </p>
          </div>
          <Button
            onClick={fetchStats}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Missing Assessments</p>
              <p className="text-3xl font-bold text-red-600">
                {stats?.missingCount || 0}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-200" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Questions</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.topics.reduce((sum, t) => sum + t.questionCount, 0) || 0}
              </p>
            </div>
            <FileText className="w-12 h-12 text-blue-200" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Marks</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.topics.reduce((sum, t) => sum + t.totalMarks, 0) || 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </Card>
      </div>

      {/* Actions */}
      {stats && stats.missingCount > 0 && (
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Bulk Actions
              </h3>
              <p className="text-gray-700 mb-4">
                Create assessments for all {stats.missingCount} topics at once, or select specific topics below.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateAll}
                  disabled={processingAll || loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating All...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Create All {stats.missingCount} Assessments
                    </>
                  )}
                </Button>

                {selectedTopics.size > 0 && (
                  <Button
                    onClick={() => {
                      // TODO: Implement batch create for selected
                      alert(`Creating ${selectedTopics.size} assessments...`);
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Selected ({selectedTopics.size})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Topics List */}
      {stats && stats.missingCount > 0 ? (
        <Card className="overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Topics Missing Assessments ({stats.missingCount})
              </h3>
              <Button
                onClick={toggleSelectAll}
                variant="ghost"
                size="sm"
              >
                {selectedTopics.size === stats.topics.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {stats.topics.map((topic) => (
              <div
                key={topic.lessonTopicId}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  selectedTopics.has(topic.lessonTopicId) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTopics.has(topic.lessonTopicId)}
                      onChange={() => toggleTopicSelection(topic.lessonTopicId)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-1">
                        {topic.topicTitle}
                      </h4>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {topic.subjectName}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {topic.questionCount} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {topic.totalMarks} marks
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Topic ID: {topic.lessonTopicId}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Subject ID: {topic.subjectId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCreateSingle(topic.lessonTopicId)}
                    disabled={processingSingle === topic.lessonTopicId || loading}
                    className="ml-4"
                  >
                    {processingSingle === topic.lessonTopicId ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Assessment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : stats && stats.missingCount === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            All lesson topics with AI-generated questions have assessments.
          </p>
        </Card>
      ) : null}

      {/* Info Box */}
      <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          How It Works
        </h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex gap-2">
            <span>•</span>
            <span>
              Automatically creates assessments for lesson topics that have AI-generated questions
            </span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>
              Questions are copied from the AI question bank to assessment questions
            </span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>
              Assessment is published and ready for students immediately
            </span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>
              New topics with AI questions will appear here automatically
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default AdminAssessmentCreationPage;