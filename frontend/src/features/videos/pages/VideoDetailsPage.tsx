// src/features/videos/pages/VideoTranscriptPage.tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVideoDetails, useVideoTranscript, useGenerateTranscript } from '../hooks/useVideoLessons';
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Clock,
  Video,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VideoTranscriptPage() {
  return <VideoTranscriptPageComponent />;
}

const VideoTranscriptPageComponent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoId = Number(id);

  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: video, isLoading: videoLoading, refetch: refetchVideo } = useVideoDetails(videoId);
  const { 
    data: transcript, 
    isLoading: transcriptLoading, 
    error: transcriptError,
    refetch: refetchTranscript 
  } = useVideoTranscript(video?.hasTranscript ? videoId : null);
  
  const generateTranscriptMutation = useGenerateTranscript();

  const isLoading = videoLoading || transcriptLoading;

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleGenerateTranscript = async () => {
    try {
      await generateTranscriptMutation.mutateAsync(videoId);
      toast.success('Transcript generation started! This may take 1-2 minutes.');
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const result = await refetchVideo();
        if (result.data?.hasTranscript) {
          clearInterval(pollInterval);
          toast.success('Transcript generated successfully!');
          refetchTranscript();
        }
      }, 5000); // Check every 5 seconds

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      toast.error('Failed to generate transcript');
    }
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

  // Show generation UI if transcript doesn't exist
  if (!video.hasTranscript || transcriptError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/teacher/videos/${videoId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Video
        </button>

        {/* Video Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-6 h-6 text-blue-600" />
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
            <span>{video.subjectName}</span>
          </div>
        </div>

        {/* Generate Transcript Card */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            {generateTranscriptMutation.isPending ? (
              <Loader className="w-16 h-16 text-blue-600 animate-spin" />
            ) : (
              <AlertCircle className="w-16 h-16 text-gray-400" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {generateTranscriptMutation.isPending 
              ? 'Generating Transcript...' 
              : 'Transcript Not Available'}
          </h2>

          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {generateTranscriptMutation.isPending
              ? 'Please wait while we generate the AI transcript. This usually takes 1-2 minutes.'
              : 'This video doesn\'t have a transcript yet. Generate one using our AI transcription service.'}
          </p>

          {!generateTranscriptMutation.isPending && (
            <button
              onClick={handleGenerateTranscript}
              disabled={generateTranscriptMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto font-medium"
            >
              <Sparkles className="w-5 h-5" />
              Generate AI Transcript
            </button>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> AI transcription typically takes 1-2 minutes for most videos. 
              You'll receive a notification when it's ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/teacher/videos/${videoId}`)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Video
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-6 h-6 text-blue-600" />
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
              <span>{video.subjectName}</span>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Transcript</h2>
        
        {filteredTranscript.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No results found for "{searchQuery}"
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTranscript.map((line, index) => {
              if (!line.trim()) return null;

              return (
                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2 hover:bg-gray-50 transition-colors">
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
          <strong>Note:</strong> This transcript was automatically generated using AI. 
          There may be minor inaccuracies or formatting differences from the actual video.
        </p>
      </div>
    </div>
  );
};