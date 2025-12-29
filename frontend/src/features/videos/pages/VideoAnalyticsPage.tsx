// ===== src/features/videos/pages/VideoAnalyticsPage.tsx =====
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Eye, Clock, Users, Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useVideoStatistics, useVideoWatchData } from '../hooks/useVideoAnalytics';
import { format } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const VideoAnalyticsPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const numericVideoId = videoId ? Number(videoId) : null;

  const { data: statistics, isLoading: loadingStats } = useVideoStatistics(numericVideoId);
  const { data: watchData, isLoading: loadingWatchData } = useVideoWatchData(numericVideoId);

  const handleExport = () => {
    if (!numericVideoId) return;
    
    // Simple CSV export
    const csv = [
      'Metric,Value',
      `Total Views,${statistics?.totalViews || 0}`,
      `Unique Viewers,${statistics?.uniqueViewers || 0}`,
      `Completed Views,${statistics?.completedViews || 0}`,
      `Average Completion Rate,${statistics?.averageCompletionRate || 0}%`,
      `Total Watch Time,${statistics?.totalWatchTimeHours || 0} hours`,
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_${videoId}_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingStats || loadingWatchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics not available</h2>
          <button
            onClick={() => navigate(`/videos/${videoId}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Video
          </button>
        </div>
      </div>
    );
  }

  // Transform completion distribution for pie chart
  const completionData = watchData?.completionDistribution ? [
    { name: '0-25%', value: watchData.completionDistribution['0-25%'] || 0 },
    { name: '25-50%', value: watchData.completionDistribution['25-50%'] || 0 },
    { name: '50-75%', value: watchData.completionDistribution['50-75%'] || 0 },
    { name: '75-100%', value: watchData.completionDistribution['75-100%'] || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(`/videos/${videoId}`)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ChevronLeft size={20} />
            <span>Back to Video</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">{statistics.title}</p>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download size={20} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Views</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="text-blue-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{statistics.totalViews}</p>
            <p className="text-sm text-gray-500 mt-2">{statistics.uniqueViewers} unique viewers</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg. Completion</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {statistics.averageCompletionRate.toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {statistics.completedViews} completed
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Watch Time</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="text-purple-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {statistics.totalWatchTimeHours.toFixed(1)}h
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Avg: {statistics.averageWatchTimeMinutes.toFixed(0)}m per viewer
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Video Duration</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="text-orange-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {statistics.durationMinutes}m
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Uploaded {format(new Date(statistics.uploadDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Completion Distribution */}
          {completionData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Completion Rate Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Watches */}
          {watchData && watchData.recentWatches && watchData.recentWatches.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Watch Sessions ({watchData.totalSessions} total)
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {watchData.recentWatches.map((watch, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{watch.studentName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(watch.watchedAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {watch.completionPercentage.toFixed(0)}%
                      </p>
                      {watch.completed && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Engagement Insights */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-white" size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Completion Rate</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {statistics.averageCompletionRate >= 70 
                      ? 'Excellent! Students are highly engaged.'
                      : statistics.averageCompletionRate >= 50
                      ? 'Good engagement, but there\'s room for improvement.'
                      : 'Consider reviewing content to improve engagement.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Eye className="text-white" size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">View Count</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {statistics.totalViews >= 100
                      ? 'Very popular content!'
                      : statistics.totalViews >= 50
                      ? 'Good reach among students.'
                      : 'Consider promoting this video more.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Clock className="text-white" size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900">Watch Time</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Average watch time is {statistics.averageWatchTimeMinutes.toFixed(0)} minutes
                    {' '}({((statistics.averageWatchTimeMinutes / statistics.durationMinutes) * 100).toFixed(0)}% of video)
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

export default VideoAnalyticsPage;