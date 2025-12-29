import React, { useState } from 'react';
import axiosInstance from '../../../api/axios';
import { Calendar, RefreshCw, Trash2, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react';

export const ScheduleGenerationPanel: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      await axiosInstance.post(
        '/admin/schedule-generation/generate',
        null,
        { params: { date: selectedDate } }
      );

      setMessage({
        type: 'success',
        text: `✅ Successfully generated schedules for ${selectedDate}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate schedules',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWeek = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      await axiosInstance.post(
        '/admin/schedule-generation/generate/week',
        null,
        { params: { startDate: selectedDate } }
      );

      setMessage({
        type: 'success',
        text: `✅ Successfully generated schedules for 7 days starting ${selectedDate}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate weekly schedules',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllWeeks = async () => {
    if (!confirm('Generate daily schedules for ALL weeks in the active term? This may take a few minutes.')) return;
    
    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await axiosInstance.post('/api/v1/weekly-schedules/generate-all-weeks');

      setMessage({
        type: 'success',
        text: `✅ Successfully generated ${response.data.schedulesCreated} daily schedules for all weeks`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate schedules for all weeks',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateForStudent = async () => {
    if (!studentId) {
      setMessage({ type: 'error', text: 'Please enter a student ID' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await axiosInstance.post(
        `/api/v1/weekly-schedules/generate-for-student/${studentId}`
      );

      setMessage({
        type: 'success',
        text: `✅ Generated ${response.data.schedulesCreated} schedules for student ${studentId}`,
      });
      setStudentId('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate schedules for student',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateForClass = async () => {
    if (!classId) {
      setMessage({ type: 'error', text: 'Please enter a class ID' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await axiosInstance.post(
        `/api/v1/weekly-schedules/generate-for-class/${classId}`
      );

      setMessage({
        type: 'success',
        text: `✅ Generated ${response.data.schedulesCreated} schedules for class ${classId}`,
      });
      setClassId('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate schedules for class',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Delete schedules older than 30 days?')) return;

    setIsGenerating(true);
    setMessage(null);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoff = cutoffDate.toISOString().split('T')[0];

      await axiosInstance.delete('/admin/schedule-generation/cleanup', {
        params: { beforeDate: cutoff },
      });

      setMessage({
        type: 'success',
        text: `✅ Successfully cleaned up old schedules before ${cutoff}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to cleanup schedules',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Daily Schedule Generation
        </h2>

        <p className="text-gray-600">
          Generate daily schedules from weekly templates for all students. This includes both
          departmental subjects and general subjects (like Civic Education and Mathematics).
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Date-based Generation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date-based Generation</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Day
          </button>

          <button
            onClick={handleGenerateWeek}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium"
          >
            <Calendar className="w-5 h-5" />
            Generate Week
          </button>

          <button
            onClick={handleCleanup}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition font-medium"
          >
            <Trash2 className="w-5 h-5" />
            Cleanup Old
          </button>
        </div>
      </div>

      {/* Bulk Generation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Bulk Generation from Weekly Templates
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Generate daily schedules for all weeks in the active term. This creates schedules for all students based on existing weekly templates.
        </p>

        <button
          onClick={handleGenerateAllWeeks}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition font-medium"
        >
          <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          Generate All Weeks
        </button>
      </div>

      {/* Target-specific Generation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Student-specific */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Generate for Student
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={handleGenerateForStudent}
              disabled={isGenerating || !studentId}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate for Student
            </button>
          </div>
        </div>

        {/* Class-specific */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Generate for Class
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class ID
              </label>
              <input
                type="number"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                placeholder="Enter class ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <button
              onClick={handleGenerateForClass}
              disabled={isGenerating || !classId}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
              Generate for Class
            </button>
          </div>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Generate Day:</strong> Creates schedules for selected date</li>
            <li>• <strong>Generate Week:</strong> Creates schedules for 7 days starting from selected date</li>
            <li>• <strong>Generate All Weeks:</strong> Creates schedules from all weekly templates in the active term</li>
            <li>• <strong>Generate for Student:</strong> Creates all schedules for a specific student</li>
            <li>• <strong>Generate for Class:</strong> Creates all schedules for all students in a class</li>
            <li>• <strong>Cleanup Old:</strong> Deletes schedules older than 30 days</li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">🤖 Automatic Generation:</h3>
          <p className="text-sm text-green-800">
            Daily schedules are automatically generated at <strong>12:01 AM</strong> for the next day.
            Manual generation is useful for:
          </p>
          <ul className="text-sm text-green-800 mt-2 space-y-1 ml-4">
            <li>• Newly enrolled students</li>
            <li>• Backfilling missed dates</li>
            <li>• After creating new weekly templates</li>
            <li>• Fixing data inconsistencies</li>
          </ul>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Duplicate schedules are automatically skipped</li>
            <li>• Only dates within the active term are processed</li>
            <li>• Weekly templates must exist before generation</li>
            <li>• "Generate All Weeks" is recommended after creating multiple weekly templates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGenerationPanel;