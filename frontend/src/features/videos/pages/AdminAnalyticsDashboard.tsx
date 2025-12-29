// ===== src/features/videos/pages/AdminVideoAnalyticsPage.tsx =====
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  TrendingUp, 
  Eye, 
  Clock, 
  Users, 
  Video as VideoIcon,
  Award,
  Activity,
  RefreshCw,
  BarChart3,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  usePlatformStats, 
  useTeacherRankings,
  useAnalyticsStatus,
  useRefreshAnalytics 
} from '../hooks/useVideoAnalytics';
import { format, subDays } from 'date-fns';

const AdminAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch data
  const { data: platformStats, isLoading: loadingStats, refetch: refetchStats } = usePlatformStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: teacherRankings = [], isLoading: loadingRankings } = useTeacherRankings({
    limit: 10,
  });

  const { data: analyticsStatus, refetch: refetchStatus } = useAnalyticsStatus();

  const { mutate: refreshAnalytics, isPending: isRefreshing } = useRefreshAnalytics();

  const handleRefresh = () => {
    refreshAnalytics(undefined, {
      onSuccess: () => {
        refetchStats();
        refetchStatus();
      },
    });
  };

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!platformStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No analytics available</h2>
          <button
            onClick={() => refetchStats()}
            className="text-blue-600 hover:text-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const healthColor = analyticsStatus?.healthStatus === 'HEALTHY' ? 'green' : 'yellow';
  const needsRefreshPercentage = analyticsStatus && analyticsStatus.totalVideos > 0
    ? ((analyticsStatus.videosNeedingRefresh / analyticsStatus.totalVideos) * 100).toFixed(1)
    : '0';

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
            <span>Back to Videos</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Platform-wide video performance and system health
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Refreshing...' : 'Refresh All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* System Health Status */}
        {analyticsStatus && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="text-blue-600" size={24} />
                    Analytics System Health
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Real-time monitoring of video analytics system
                  </p>
                </div>

                <div className={`px-4 py-2 rounded-full bg-${healthColor}-100 text-${healthColor}-700 font-medium flex items-center gap-2`}>
                  {analyticsStatus.healthStatus === 'HEALTHY' ? (
                    <CheckCircle size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                  {analyticsStatus.healthStatus}
                </div>
              </div>
            </div>

            {/* Health Metrics */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Total Videos</span>
                  <VideoIcon className="text-blue-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-blue-900">{analyticsStatus.totalVideos}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {analyticsStatus.videosWithAnalytics} with analytics
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Up to Date</span>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {analyticsStatus.totalVideos - analyticsStatus.videosNeedingRefresh}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {((analyticsStatus.totalVideos - analyticsStatus.videosNeedingRefresh) / analyticsStatus.totalVideos * 100).toFixed(0)}% healthy
                </p>
              </div>

              <div className={`bg-${healthColor}-50 rounded-lg p-4 border border-${healthColor}-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium text-${healthColor}-900`}>Need Refresh</span>
                  <AlertTriangle className={`text-${healthColor}-600`} size={20} />
                </div>
                <p className={`text-3xl font-bold text-${healthColor}-900`}>
                  {analyticsStatus.videosNeedingRefresh}
                </p>
                <p className={`text-xs text-${healthColor}-700 mt-1`}>
                  {needsRefreshPercentage}% of total
                </p>
              </div>
            </div>

            {/* Status Message */}
            <div className="px-6 pb-6">
              <div className={`p-4 bg-${healthColor}-50 border border-${healthColor}-200 rounded-lg`}>
                <p className={`text-sm text-${healthColor}-800 font-medium`}>
                  {analyticsStatus.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Last checked: {new Date(analyticsStatus.lastRefreshTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
              <p className="text-sm text-gray-500 mt-1">
                {format(new Date(dateRange.startDate), 'MMM d')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
              </p>
            </div>
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

        {/* Platform Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Videos</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <VideoIcon className="text-blue-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{platformStats.totalVideos}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {platformStats.publishedVideos} published
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                {platformStats.processingVideos} processing
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Views</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="text-green-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {platformStats.totalViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Platform-wide video views
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Teachers</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="text-purple-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{platformStats.uniqueTeachers}</p>
            <p className="text-sm text-gray-500 mt-2">
              Teachers creating content
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">New Videos</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="text-orange-600" size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {platformStats.videosUploadedInRange}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              In selected period
            </p>
          </div>
        </div>

        {/* Teacher Rankings */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="text-yellow-500" size={24} />
                  Top Teachers by Performance
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Ranked by total views and video count
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Teachers →
              </button>
            </div>
          </div>

          <div className="p-6">
            {loadingRankings ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : teacherRankings.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No teacher data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherRankings.map((teacher, index) => (
                  <div
                    key={teacher.teacherId}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                    onClick={() => navigate(`/videos?teacherId=${teacher.teacherId}`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank Badge */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'
                            : index === 1
                            ? 'bg-gray-200 text-gray-700 border-2 border-gray-400'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>

                      {/* Teacher Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {teacher.teacherName}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <VideoIcon size={14} />
                            {teacher.videoCount} videos
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {teacher.totalViews.toLocaleString()} views
                          </span>
                        </div>
                      </div>

                      {/* Performance Indicator */}
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {teacher.totalViews.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">total views</p>
                          </div>
                          <TrendingUp className="text-green-500" size={24} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Platform Insights & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              Platform Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">📈 Content Growth</p>
                <p className="text-xs text-blue-700 mt-1">
                  {platformStats.videosUploadedInRange} new videos in selected period
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">👥 Teacher Activity</p>
                <p className="text-xs text-green-700 mt-1">
                  {platformStats.uniqueTeachers} active teachers
                </p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-900">🎯 Total Engagement</p>
                <p className="text-xs text-purple-700 mt-1">
                  {platformStats.totalViews.toLocaleString()} platform-wide views
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={20} />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/videos')}
                className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-left flex items-center justify-between group"
              >
                <span className="font-medium">View All Videos</span>
                <VideoIcon size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-left flex items-center justify-between group"
              >
                <span className="font-medium">Manage Teachers</span>
                <Users size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-left flex items-center justify-between group disabled:opacity-50"
              >
                <span className="font-medium">Refresh Analytics</span>
                <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform`} />
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Activity className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">About Platform Analytics</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Analytics refresh automatically every 15 minutes</li>
                <li>• View counts update in real-time as students watch</li>
                <li>• Teacher rankings based on total views and video count</li>
                <li>• Use date filters to analyze specific periods</li>
                <li>• Manual refresh recalculates all video statistics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;