import { useState } from 'react';
import { TeacherQuestion } from '../types/assessmentTypes';
import { useMyQuestions, useDeleteQuestion } from '../hooks/useTeacherQuestions';
import { Edit2, Trash2, Plus, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TeacherQuestionBankProps {
  onEditQuestion?: (question: TeacherQuestion) => void;
  onCreateNew?: () => void;
}

export const TeacherQuestionBank: React.FC<TeacherQuestionBankProps> = ({
  onEditQuestion,
  onCreateNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  
  const { data: questions = [], isLoading } = useMyQuestions();
  const deleteQuestion = useDeleteQuestion();

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await deleteQuestion.mutateAsync(id);
        toast.success('Question deleted successfully');
      } catch (error) {
        toast.error('Failed to delete question');
      }
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || q.subjectId.toString() === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subjectName)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Question Bank</h2>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Question
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No questions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {question.subjectName}
                    </span>
                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                      {question.questionType.replace(/_/g, ' ')}
                    </span>
                    {question.difficultyLevel && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        question.difficultyLevel === 'EASY'
                          ? 'bg-green-100 text-green-800'
                          : question.difficultyLevel === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.difficultyLevel}
                      </span>
                    )}
                  </div>
                  {question.lessonTopicTitle && (
                    <p className="text-sm text-gray-600 mb-2">
                      Lesson: {question.lessonTopicTitle}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {onEditQuestion && (
                    <button
                      onClick={() => onEditQuestion(question)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    disabled={deleteQuestion.isPending}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-gray-900 font-medium mb-3">{question.questionText}</p>

              {/* Options */}
              {question.questionType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2 mb-3">
                  {[
                    { label: 'A', value: question.optionA },
                    { label: 'B', value: question.optionB },
                    { label: 'C', value: question.optionC },
                    { label: 'D', value: question.optionD }
                  ].filter(opt => opt.value).map((option) => (
                    <div
                      key={option.label}
                      className={`p-3 rounded-lg ${
                        question.correctAnswer === option.label
                          ? 'bg-green-50 border-2 border-green-300'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <span className="font-medium mr-2">{option.label}.</span>
                      <span className="text-gray-700">{option.value}</span>
                      {question.correctAnswer === option.label && (
                        <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Non-MCQ Answer */}
              {question.questionType !== 'MULTIPLE_CHOICE' && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-700">Correct Answer: </span>
                  <span className="text-gray-900">{question.correctAnswer}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};