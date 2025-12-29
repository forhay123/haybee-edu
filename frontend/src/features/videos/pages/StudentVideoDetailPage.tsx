// src/features/videos/pages/StudentVideoDetailPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useVideoDetails, useVideoChapters, useRecordWatchProgress } from '../hooks/useVideoLessons';
import { 
  ArrowLeft, 
  Clock, 
  Calendar,
  Video,
  BookOpen,
  Play,
  Eye,
  Star,
  CheckCircle,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ TypeScript declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const StudentVideoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoId = Number(id);

  // ✅ Get timestamp from URL if present (for chapter navigation)
  const timestamp = searchParams.get('t');
  const startTime = timestamp ? parseInt(timestamp) : 0;

  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);

  // ✅ Refs for tracking
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLDivElement>(null);
  const lastSavedTime = useRef(0);
  const saveInterval = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ Refs to avoid stale closures
  const currentTimeRef = useRef(currentTime);
  const videoDurationRef = useRef(videoDuration);
  const videoIdRef = useRef(videoId);

  const { data: video, isLoading: videoLoading } = useVideoDetails(videoId);
  const { data: chapters = [], isLoading: chaptersLoading } = useVideoChapters(
    video?.hasChapters ? videoId : null
  );
  const recordProgress = useRecordWatchProgress();

  const isLoading = videoLoading || chaptersLoading;

  // ✅ Keep refs synced with state
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    videoDurationRef.current = videoDuration;
  }, [videoDuration]);

  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);

  // ✅ CRITICAL: Initialize YouTube Player
  useEffect(() => {
    if (!video?.youtubeVideoId) {
      console.log('⏸️ No YouTube video ID available yet');
      return;
    }

    console.log('🎬 Initializing YouTube player for video:', video.youtubeVideoId);

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      console.log('📥 Loading YouTube IFrame API...');
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let player: any = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        console.log('⏳ YouTube API not ready yet...');
        return;
      }

      if (!iframeRef.current) {
        console.log('⚠️ Iframe container not found');
        return;
      }

      console.log('✅ Creating YouTube player instance...');

      try {
        player = new window.YT.Player(iframeRef.current, {
          videoId: video.youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            start: video.lastPositionSeconds || startTime || 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              console.log('✅ YouTube player ready');
              playerRef.current = event.target;
              setPlayerReady(true);
              
              const duration = Math.floor(event.target.getDuration());
              setVideoDuration(duration);
              videoDurationRef.current = duration;
              
              console.log('📊 Video duration:', duration, 'seconds');
              
              // Seek to saved position if available
              if (video.lastPositionSeconds && video.lastPositionSeconds > 0) {
                console.log('⏩ Seeking to saved position:', video.lastPositionSeconds);
                event.target.seekTo(video.lastPositionSeconds, true);
              }
            },
            onStateChange: (event: any) => {
              const state = event.data;
              const YT = window.YT;
              
              console.log('🎥 Player state changed:', {
                state,
                stateName: 
                  state === YT.PlayerState.UNSTARTED ? 'UNSTARTED' :
                  state === YT.PlayerState.ENDED ? 'ENDED' :
                  state === YT.PlayerState.PLAYING ? 'PLAYING' :
                  state === YT.PlayerState.PAUSED ? 'PAUSED' :
                  state === YT.PlayerState.BUFFERING ? 'BUFFERING' :
                  state === YT.PlayerState.CUED ? 'CUED' : 'UNKNOWN'
              });

              if (state === YT.PlayerState.PLAYING) {
                console.log('▶️ Video is now playing');
                setIsPlaying(true);
                startProgressTracking(event.target);
              } else if (state === YT.PlayerState.PAUSED) {
                console.log('⏸️ Video paused');
                setIsPlaying(false);
                stopProgressTracking();
                saveCurrentProgress();
              } else if (state === YT.PlayerState.ENDED) {
                console.log('🏁 Video ended');
                setIsPlaying(false);
                stopProgressTracking();
                markAsCompleted();
              }
            },
            onError: (event: any) => {
              console.error('❌ YouTube player error:', event.data);
              toast.error('Error loading video. Please refresh the page.');
            },
          },
        });

        console.log('✅ Player instance created');
      } catch (error) {
        console.error('❌ Failed to create player:', error);
      }
    };

    // Wait for API to load
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      console.log('⏳ Waiting for YouTube API to load...');
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      console.log('🧹 Cleaning up player...');
      stopProgressTracking();
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      
      if (player?.destroy) {
        try {
          player.destroy();
        } catch (err) {
          console.log('Player cleanup error:', err);
        }
      }
    };
  }, [video?.youtubeVideoId]);

  // ✅ Progress tracking function
  const startProgressTracking = (player: any) => {
    console.log('🔵 Starting progress tracking...');
    
    // Clear any existing intervals
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    if (saveInterval.current) {
      clearInterval(saveInterval.current);
    }

    // Track current time every second
    progressInterval.current = setInterval(() => {
      try {
        if (player && player.getCurrentTime && player.getDuration) {
          const current = Math.floor(player.getCurrentTime());
          const duration = Math.floor(player.getDuration());
          
          setCurrentTime(current);
          setVideoDuration(duration);
          currentTimeRef.current = current;
          videoDurationRef.current = duration;
        }
      } catch (error) {
        console.error('Error getting time:', error);
      }
    }, 1000);

    // Save progress every 10 seconds
    saveInterval.current = setInterval(() => {
      saveCurrentProgress();
    }, 10000);

    console.log('✅ Progress tracking started');
  };

  const stopProgressTracking = () => {
    console.log('⏸️ Stopping progress tracking...');
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (saveInterval.current) {
      clearInterval(saveInterval.current);
      saveInterval.current = null;
    }
  };

  // ✅ Save current progress
  const saveCurrentProgress = () => {
    const position = currentTimeRef.current;
    const duration = videoDurationRef.current;
    const currentVideoId = videoIdRef.current;
    
    if (duration === 0) {
      console.log('⏸️ Duration not available yet, skipping save');
      return;
    }

    // Don't save if position hasn't changed much
    if (Math.abs(position - lastSavedTime.current) < 5) {
      console.log('⏸️ Position unchanged, skipping save');
      return;
    }

    const completionPercentage = (position / duration) * 100;
    const isCompleted = completionPercentage >= 90;

    console.log('💾 Saving watch progress:', {
      videoId: currentVideoId,
      position,
      duration,
      completionPercentage: completionPercentage.toFixed(1) + '%',
      isCompleted,
      timestamp: new Date().toISOString(),
    });

    recordProgress.mutate({
      videoId: currentVideoId,
      watchedSeconds: Math.floor(position),
      totalSeconds: duration,
      completed: isCompleted,
    }, {
      onSuccess: () => {
        console.log('✅ Progress saved successfully');
        lastSavedTime.current = position;
      },
      onError: (error) => {
        console.error('❌ Failed to save progress:', error);
      }
    });
  };

  // ✅ Mark video as completed
  const markAsCompleted = () => {
    const duration = videoDurationRef.current;
    const currentVideoId = videoIdRef.current;
    
    if (duration === 0) return;

    console.log('✅ Marking video as completed');

    recordProgress.mutate({
      videoId: currentVideoId,
      watchedSeconds: duration,
      totalSeconds: duration,
      completed: true,
    }, {
      onSuccess: () => {
        console.log('🎉 Video marked as completed!');
        toast.success('🎉 Video completed!');
      }
    });
  };

  // ✅ Save progress when leaving page
  useEffect(() => {
    return () => {
      console.log('👋 Component unmounting, saving final progress...');
      
      const position = currentTimeRef.current;
      const duration = videoDurationRef.current;
      const currentVideoId = videoIdRef.current;
      
      if (duration === 0 || position === 0) {
        console.log('⏸️ No meaningful progress to save');
        return;
      }
      
      // Don't save if position hasn't changed
      if (Math.abs(position - lastSavedTime.current) < 5) {
        console.log('⏸️ Position unchanged since last save');
        return;
      }
      
      const completionPercentage = (position / duration) * 100;
      const isCompleted = completionPercentage >= 90;
      
      console.log('💾 Final save:', {
        videoId: currentVideoId,
        position,
        duration,
        completionPercentage: completionPercentage.toFixed(1) + '%',
        isCompleted
      });
      
      // Use synchronous API call for cleanup
      recordProgress.mutate({
        videoId: currentVideoId,
        watchedSeconds: Math.floor(position),
        totalSeconds: duration,
        completed: isCompleted,
      });
    };
  }, []); // Empty deps - only runs on unmount

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

  const handleShare = () => {
    if (navigator.share && video) {
      navigator.share({
        title: video.title,
        text: video.description || `Watch ${video.title}`,
        url: window.location.href,
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleChapterClick = (startTimeSeconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      console.log('⏩ Seeking to chapter at:', startTimeSeconds);
      playerRef.current.seekTo(startTimeSeconds, true);
      playerRef.current.playVideo();
      
      setCurrentTime(startTimeSeconds);
      currentTimeRef.current = startTimeSeconds;
      
      toast.success('Jumped to chapter!');
    } else {
      console.warn('⚠️ Player not ready for seeking');
      navigate(`/videos/${videoId}/details?t=${startTimeSeconds}`, { replace: true });
    }
    
    document.getElementById('video-player-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
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
        onClick={() => navigate('/videos')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Videos
      </button>

      {/* Video Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{video.title}</h1>
            
            {video.description && (
              <p className="text-gray-600 mb-4">{video.description}</p>
            )}

            {/* Video Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(video.durationSeconds)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {video.totalViews || 0} views
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(video.uploadDate)}
              </span>
            </div>

            {/* Progress Indicator */}
            {video.completionPercentage !== undefined && video.completionPercentage > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Your Progress</span>
                  <span className="font-medium text-blue-600">
                    {Math.round(video.completionPercentage)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${video.completionPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Teacher & Subject Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {video.subjectName}
                </span>
                {video.lessonTopicTitle && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {video.lessonTopicTitle}
                  </span>
                )}
                {video.isAspirantMaterial && (
                  <span className="px-3 py-1 bg-purple-500 text-white rounded-full font-medium flex items-center gap-1">
                    🎯 ASPIRANT
                  </span>
                )}
              </div>
              <span className="text-gray-600">
                by <span className="font-medium text-gray-900">{video.teacherName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div id="video-player-section" className="mb-6">
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <div ref={iframeRef} className="w-full h-full" />
            
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white">Loading player...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time progress display */}
        {isPlaying && videoDuration > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-800 font-medium">
                ⏺ Currently watching: {formatDuration(currentTime)} / {formatDuration(videoDuration)}
              </span>
              <span className="text-blue-600">
                Progress auto-saves every 10 seconds
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleShare}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>

          {video.completed && (
            <span className="px-4 py-3 bg-green-100 text-green-700 rounded-lg flex items-center gap-2 font-medium">
              <CheckCircle className="w-5 h-5" />
              Completed
            </span>
          )}

          {video.isPremium && (
            <span className="px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg flex items-center gap-2 font-medium">
              <Star className="w-5 h-5" />
              Premium Content
            </span>
          )}
        </div>
      </div>

      {/* Study Materials Section */}
      {(video.hasTranscript || video.hasChapters) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Study Materials</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {video.hasTranscript && (
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Transcript</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Read the full video transcript with search functionality
                </p>
                <button
                  onClick={() => navigate(`/videos/${videoId}/transcript`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View Transcript
                </button>
              </div>
            )}

            {video.hasChapters && (
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Chapters</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Navigate through {chapters.length} video chapters
                </p>
                <button
                  onClick={() => document.getElementById('chapters-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  View Chapters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chapters Display Section */}
      {video.hasChapters && chapters.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6" id="chapters-section">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Video className="w-6 h-6 text-purple-600" />
            Video Chapters
          </h2>
          <p className="text-gray-600 mb-6">
            Jump to specific sections of the video by clicking on any chapter below
          </p>
          
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <div 
                key={chapter.id} 
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleChapterClick(chapter.startTimeSeconds)}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 text-lg">{chapter.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {formatDuration(chapter.startTimeSeconds)} - {formatDuration(chapter.endTimeSeconds)}
                      <span className="ml-2 text-gray-400">
                        ({formatDuration(chapter.endTimeSeconds - chapter.startTimeSeconds)})
                      </span>
                    </p>
                    {chapter.summary && (
                      <p className="text-sm text-gray-700 mb-3">{chapter.summary}</p>
                    )}
                    {chapter.keyConcepts && chapter.keyConcepts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {chapter.keyConcepts.map((concept, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Play className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Study Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-7">
          <li>• Your progress is automatically saved every 10 seconds</li>
          <li>• Use chapters to navigate to specific topics quickly</li>
          <li>• Read the transcript to review key concepts</li>
          <li>• Take notes while watching for better retention</li>
          <li>• Watch at least 90% to mark video as completed</li>
        </ul>
      </div>
    </div>
  );
};