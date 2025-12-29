import { useParams, useNavigate } from 'react-router-dom';
import { useSubmission } from '../hooks/useAssessments';
import { SubmissionResults } from '../components/SubmissionResults';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const AssessmentResultsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const studentProfileId = 1; // Get from auth context

  const { data: submission, isLoading } = useSubmission(
    Number(assessmentId),
    studentProfileId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 text-lg mb-4">No submission found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Assessments
      </button>

      {/* Results */}
      <SubmissionResults submission={submission} />
    </div>
  );
};