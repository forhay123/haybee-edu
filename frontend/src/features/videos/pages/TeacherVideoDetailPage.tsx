// src/features/videos/pages/TeacherVideoDetailPage.tsx
// FIXED: Stops polling when generation is complete or on error

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  useVideoDetails, 
  useVideoChapters, 
  useTogglePublishVideo, 
  useDeleteVideo,
  useGenerateChapters,
  useGenerateTranscript 
} from '../hooks/useVideoLessons';
import { 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Users, 
  Clock, 
  Calendar,
  Video,
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader
} from 'lucide-react';

interface GenerationState {
  isGenerating: boolean;
  taskId?: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export const TeacherVideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Generation state management
  const [transcriptState, setTranscriptState] = useState<GenerationState>({ 
    isGenerating: false, 
    status: 'idle' 
  });
  const [chaptersState, setChaptersState] = useState<GenerationState>({ 
    isGenerating: false, 
    status: 'idle' 
  });
  
  // Polling references
  const transcriptPollRef = useRef<NodeJS.Timeout | null>(null);
  const chaptersPollRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef({ transcript: 0, chapters: 0 });
  const MAX_POLL_ATTEMPTS = 120; // 6 minutes max (120 * 3 seconds)

  const videoId = Number(id);
  const { data: video, isLoading: videoLoading, refetch: refetchVideo } = useVideoDetails(videoId);
  const { data: chapters = [], isLoading: chaptersLoading, refetch: refetchChapters } = useVideoChapters(
    video?.hasChapters ? videoId : null
  );
  
  const togglePublishMutation = useTogglePublishVideo();
  const deleteVideoMutation = useDeleteVideo();
  const generateChaptersMutation = useGenerateChapters();
  const generateTranscriptMutation = useGenerateTranscript();

  const isLoading = videoLoading || chaptersLoading;

  // Stop polling helper
  const stopTranscriptPolling = () => {
    if (transcriptPollRef.current) {
      clearInterval(transcriptPollRef.current);
      transcriptPollRef.current = null;
    }
    pollAttemptsRef.current.transcript = 0;
  };

  const stopChaptersPolling = () => {
    if (chaptersPollRef.current) {
      clearInterval(chaptersPollRef.current);
      chaptersPollRef.current = null;
    }
    pollAttemptsRef.current.chapters = 0;
  };

  // Polling function for transcript
  const startTranscriptPolling = () => {
    stopTranscriptPolling(); // Clear any existing polling
    pollAttemptsRef.current.transcript = 0;

    const poll = async () => {
      try {
        pollAttemptsRef.current.transcript++;

        // Check if max attempts exceeded
        if (pollAttemptsRef.current.transcript > MAX_POLL_ATTEMPTS) {
          setTranscriptState(prev => ({
            ...prev,
            isGenerating: false,
            status: 'error',
            message: 'Transcript generation timeout'
          }));
          stopTranscriptPolling();
          return;
        }

        // Refetch video data
        const result = await refetchVideo();
        
        if (result.data?.hasTranscript) {
          console.log('✅ Transcript generation complete!');
          setTranscriptState({
            isGenerating: false,
            status: 'success',
            message: 'Transcript generated successfully'
          });
          stopTranscriptPolling();
        } else {
          console.log(`⏳ Polling transcript... attempt ${pollAttemptsRef.current.transcript}`);
        }
      } catch (error) {
        console.error('❌ Error polling transcript:', error);
        setTranscriptState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'error',
          message: 'Error checking transcript status'
        }));
        stopTranscriptPolling();
      }
    };

    // Start polling
    transcriptPollRef.current = setInterval(poll, 3000);
    // First poll immediately
    poll();
  };

  // Polling function for chapters
  const startChaptersPolling = () => {
    stopChaptersPolling(); // Clear any existing polling
    pollAttemptsRef.current.chapters = 0;

    const poll = async () => {
      try {
        pollAttemptsRef.current.chapters++;

        // Check if max attempts exceeded
        if (pollAttemptsRef.current.chapters > MAX_POLL_ATTEMPTS) {
          setChaptersState(prev => ({
            ...prev,
            isGenerating: false,
            status: 'error',
            message: 'Chapters generation timeout'
          }));
          stopChaptersPolling();
          return;
        }

        // Refetch video data
        const result = await refetchVideo();
        
        if (result.data?.hasChapters) {
          console.log('✅ Chapters generation complete!');
          // Also refetch chapters data
          await refetchChapters();
          setChaptersState({
            isGenerating: false,
            status: 'success',
            message: 'Chapters generated successfully'
          });
          stopChaptersPolling();
        } else {
          console.log(`⏳ Polling chapters... attempt ${pollAttemptsRef.current.chapters}`);
        }
      } catch (error) {
        console.error('❌ Error polling chapters:', error);
        setChaptersState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'error',
          message: 'Error checking chapters status'
        }));
        stopChaptersPolling();
      }
    };

    // Start polling
    chaptersPollRef.current = setInterval(poll, 3000);
    // First poll immediately
    poll();
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopTranscriptPolling();
      stopChaptersPolling();
    };
  }, []);

  const handleTogglePublish = async () => {
    try {
      await togglePublishMutation.mutateAsync(videoId);
      refetchVideo();
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVideoMutation.mutateAsync(videoId);
      navigate('/videos');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleEdit = () => {
    navigate(`/videos/${videoId}/edit`);
  };

  const handleViewAnalytics = () => {
    navigate(`/videos/${videoId}/analytics`);
  };

  const handleGenerateChapters = async () => {
    try {
      console.log('🚀 Initiating chapter generation...');
      setChaptersState({
        isGenerating: true,
        status: 'processing',
        message: 'Starting chapter generation...'
      });

      const response = await generateChaptersMutation.mutateAsync(videoId);
      console.log('📤 Chapter generation queued:', response);
      
      // Start polling for completion
      startChaptersPolling();
    } catch (error) {
      console.error('❌ Failed to generate chapters:', error);
      setChaptersState({
        isGenerating: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate chapters'
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setChaptersState(prev => ({ ...prev, message: undefined }));
      }, 5000);
    }
  };

  const handleGenerateTranscript = async () => {
    try {
      console.log('🚀 Initiating transcript generation...');
      setTranscriptState({
        isGenerating: true,
        status: 'processing',
        message: 'Starting transcript generation...'
      });

      const response = await generateTranscriptMutation.mutateAsync(videoId);
      console.log('📤 Transcript generation queued:', response);
      
      // Start polling for completion
      startTranscriptPolling();
    } catch (error) {
      console.error('❌ Failed to generate transcript:', error);
      setTranscriptState({
        isGenerating: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate transcript'
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setTranscriptState(prev => ({ ...prev, message: undefined }));
      }, 5000);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return 'Processing...';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 text-lg">Video not found</p>
          <button
            onClick={() => navigate('/videos')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
              
              {/* Status Badges */}
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    video.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {video.published ? 'Published' : 'Draft'}
                </span>
                
                {video.status !== 'PUBLISHED' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                    {video.status}
                  </span>
                )}
              </div>
            </div>
            
            {video.description && (
              <p className="text-gray-600 mb-4">{video.description}</p>
            )}
          </div>
        </div>

        {/* Video Thumbnail */}
        {video.thumbnailUrl && (
          <div className="mb-6 relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="object-cover w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Eye className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{video.totalViews || 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(video.durationSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Users className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Avg. Completion</p>
              <p className="text-2xl font-bold text-gray-900">
                {video.averageCompletionRate
                  ? `${(video.averageCompletionRate * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Uploaded</p>
              <p className="text-lg font-bold text-gray-900">
                {formatDate(video.uploadDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Video
          </button>

          <button
            onClick={handleTogglePublish}
            disabled={togglePublishMutation.isPending || video.status === 'PROCESSING'}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              video.published
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {video.published ? (
              <>
                <EyeOff className="w-4 h-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Publish
              </>
            )}
          </button>

          <button
            onClick={handleViewAnalytics}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            View Analytics
          </button>

          <button
            onClick={() => navigate(`/videos/${videoId}`)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Watch Video
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Video Details Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Video Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Subject</h3>
            <p className="text-gray-900">{video.subjectName}</p>
          </div>

          {video.lessonTopicTitle && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Lesson Topic</h3>
              <p className="text-gray-900">{video.lessonTopicTitle}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Teacher</h3>
            <p className="text-gray-900">{video.teacherName}</p>
            {video.teacherEmail && (
              <p className="text-sm text-gray-600">{video.teacherEmail}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Availability</h3>
            <div className="flex flex-wrap gap-2">
              {video.isPublic && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Public
                </span>
              )}
              {video.isAspirantMaterial && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  Aspirant Material
                </span>
              )}
              {video.isPremium && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Features Section - IMPROVED VERSION */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          AI Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transcript */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Transcript</h3>
              </div>
              {transcriptState.status === 'processing' ? (
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              ) : video.hasTranscript ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {transcriptState.status === 'processing'
                ? 'Generating AI transcript (this may take 1-2 minutes)...'
                : transcriptState.status === 'error'
                ? `Error: ${transcriptState.message}`
                : transcriptState.status === 'success'
                ? 'Transcript generated successfully!'
                : video.hasTranscript 
                ? 'AI-generated transcript available' 
                : 'Generate searchable transcript'}
            </p>
            
            {transcriptState.status !== 'processing' && !video.hasTranscript && (
              <button
                onClick={handleGenerateTranscript}
                disabled={generateTranscriptMutation.isPending || transcriptState.isGenerating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {generateTranscriptMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  'Generate Transcript'
                )}
              </button>
            )}

            {video.hasTranscript && (
              <button
                onClick={() => navigate(`/teacher/videos/${videoId}/transcript`)}
                className="w-full px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-medium"
              >
                View Transcript
              </button>
            )}
          </div>

          {/* Chapters */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Chapters</h3>
              </div>
              {chaptersState.status === 'processing' ? (
                <Loader className="w-5 h-5 text-purple-600 animate-spin" />
              ) : video.hasChapters ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {chaptersState.status === 'processing'
                ? 'Generating AI chapters (this may take 30-60 seconds)...'
                : chaptersState.status === 'error'
                ? `Error: ${chaptersState.message}`
                : chaptersState.status === 'success'
                ? 'Chapters generated successfully!'
                : video.hasChapters 
                ? `${chapters.length} AI-generated chapters` 
                : 'Break video into chapters'}
            </p>
            
            {chaptersState.status !== 'processing' && !video.hasChapters && (
              <button
                onClick={handleGenerateChapters}
                disabled={generateChaptersMutation.isPending || chaptersState.isGenerating}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {generateChaptersMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Queuing...
                  </>
                ) : (
                  'Generate Chapters'
                )}
              </button>
            )}

            {video.hasChapters && (
              <button
                onClick={() => document.getElementById('chapters-list')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 font-medium"
              >
                View {chapters.length} Chapters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chapters List (if available) */}
      {video.hasChapters && chapters.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6" id="chapters-list">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chapters</h2>
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <div key={chapter.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{chapter.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {Math.floor(chapter.startTimeSeconds / 60)}:{(chapter.startTimeSeconds % 60).toString().padStart(2, '0')} - 
                      {Math.floor(chapter.endTimeSeconds / 60)}:{(chapter.endTimeSeconds % 60).toString().padStart(2, '0')}
                    </p>
                    {chapter.summary && (
                      <p className="text-sm text-gray-700">{chapter.summary}</p>
                    )}
                    {chapter.keyConcepts && chapter.keyConcepts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {chapter.keyConcepts.map((concept, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Video?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{video.title}"? This action cannot be undone and will also remove the video from YouTube.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteVideoMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteVideoMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};