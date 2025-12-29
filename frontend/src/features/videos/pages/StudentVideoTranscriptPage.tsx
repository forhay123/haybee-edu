// src/features/videos/pages/StudentVideoTranscriptPage.tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useVideoDetails, useVideoTranscript } from '../hooks/useVideoLessons';
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Clock,
  Video,
  Copy,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentVideoTranscriptPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoId = Number(id);

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // ✅ Determine if user is a student
  const isStudent = user?.roles?.includes('STUDENT');
  const isParent = user?.roles?.includes('PARENT');

  const { data: video, isLoading: videoLoading } = useVideoDetails(videoId);
  const { 
    data: transcript, 
    isLoading: transcriptLoading, 
    error: transcriptError 
  } = useVideoTranscript(video?.hasTranscript ? videoId : null);

  const isLoading = videoLoading || transcriptLoading;

  // ✅ Get the correct back URL based on user role
  const getBackUrl = () => {
    if (isStudent || isParent) {
      return `/videos/${videoId}/details`;
    }
    return `/videos/${videoId}`;
  };

  // ✅ Get the correct video watch URL based on user role
  const getVideoUrl = () => {
    if (isStudent || isParent) {
      return `/videos/${videoId}/details`;
    }
    return `/videos/${videoId}`;
  };

  const handleCopyTranscript = async () => {
    if (!transcript) return;
    
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success('Transcript copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy transcript');
    }
  };

  const handleDownloadTranscript = () => {
    if (!transcript || !video) return;

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded!');
  };

  const highlightSearchQuery = (text: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filteredTranscript = transcript && searchQuery.trim()
    ? transcript.split('\n').filter(line => 
        line.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript?.split('\n') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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

  if (!video.hasTranscript || transcriptError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(getBackUrl())}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Video
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Transcript Not Available
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            The transcript for this video is not yet available. Please check back later.
          </p>
          <button
            onClick={() => navigate(getVideoUrl())}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Watch Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button - ✅ FIXED: Use correct back URL */}
      <button
        onClick={() => navigate(getBackUrl())}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Video
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
            </div>
            {video.description && (
              <p className="text-gray-600 mb-3">{video.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span>•</span>
              <span className="font-medium text-purple-600">{video.subjectName}</span>
              {video.lessonTopicTitle && (
                <>
                  <span>•</span>
                  <span>{video.lessonTopicTitle}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopyTranscript}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Transcript
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTranscript}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          {/* ✅ FIXED: Use correct video URL */}
          <button
            onClick={() => navigate(getVideoUrl())}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Video className="w-4 h-4" />
            Watch Video
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search in transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Found {filteredTranscript.length} line{filteredTranscript.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Transcript Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Transcript
        </h2>
        
        {filteredTranscript.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No results found for "{searchQuery}"
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTranscript.map((line, index) => {
              if (!line.trim()) return null;

              return (
                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2 hover:bg-gray-50 transition-colors rounded">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {highlightSearchQuery(line)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Study Tip:</strong> Use the search feature above to quickly find specific topics or concepts in the transcript.
          This transcript was automatically generated using AI and may contain minor inaccuracies.
        </p>
      </div>
    </div>
  );
};