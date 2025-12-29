// ===== src/features/videos/pages/TeacherAnalyticsOverviewPage.tsx =====
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Eye, Clock, Users, Video as VideoIcon } from 'lucide-react';
import { useTeacherAnalytics, useTopVideos } from '../hooks/useVideoAnalytics';
import { format, subDays } from 'date-fns';

const TeacherAnalyticsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: analytics, isLoading } = useTeacherAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: topVideos = [] } = useTopVideos({ limit: 5, sortBy: 'views' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No analytics available</h2>
          <button
            onClick={() => navigate('/videos')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/videos')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ChevronLeft size={20} />
            <span>Back to Library</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Analytics Overview</h1>
              <p className="mt-1 text-sm text-gray-500">
                {format(new Date(dateRange.startDate), 'MMM d')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Videos</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <VideoIcon className="text-blue-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalVideos}</p>
            <p className="text-sm text-gray-500 mt-2">
              {analytics.publishedVideos} published, {analytics.processingVideos} processing
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Views</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="text-green-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalViews}</p>
            <p className="text-sm text-gray-500 mt-2">
              {analytics.uniqueStudents} unique students
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg. Completion</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="text-purple-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.averageCompletionRate.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {analytics.completedViews} completed views
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Watch Time</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="text-orange-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.totalWatchTimeHours.toFixed(1)}h
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Across all videos
            </p>
          </div>
        </div>

        {/* Top Performing Videos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Videos
          </h3>
          <div className="space-y-3">
            {topVideos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No videos yet</p>
            ) : (
              topVideos.map((video) => (
                <div
                  key={video.videoId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => navigate(`/videos/${video.videoId}/analytics`)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{video.title}</h4>
                    <p className="text-sm text-gray-500">{video.subjectName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{video.views} views</p>
                    <p className="text-sm text-gray-500">
                      {video.averageCompletionRate.toFixed(0)}% completion
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Engagement Insights */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-white" size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Overall Engagement</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {analytics.averageCompletionRate >= 70
                      ? 'Excellent! Your students are highly engaged with your videos.'
                      : analytics.averageCompletionRate >= 50
                      ? 'Good engagement overall. Consider adding interactive elements.'
                      : 'Low engagement detected. Review video length and content structure.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Users className="text-white" size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Student Reach</h4>
                  <p className="text-sm text-green-700 mt-1">
                    You're reaching {analytics.uniqueStudents} unique students
                    {analytics.uniqueStudents >= 100
                      ? '. Great reach!'
                      : '. Consider promoting your content more.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalyticsOverviewPage;