// ===== src/features/videos/components/VideoPlayer.tsx =====
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { useRecordWatchProgress } from '../hooks/useVideoLessons';
import { IChapter } from '../types/videoTypes';

interface VideoPlayerProps {
  video: {
    id: number;
    youtubeVideoId: string;
    embedUrl: string;
    title: string;
    lastPositionSeconds?: number;
  };
  chapters?: IChapter[];
  onProgressUpdate?: (position: number, duration: number) => void;
  autoPlay?: boolean;
  showCustomControls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  chapters = [],
  onProgressUpdate,
  autoPlay = false,
  showCustomControls = false,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPositionRef = useRef<number>(0);

  const { mutate: recordProgress } = useRecordWatchProgress();

  // Initialize YouTube IFrame API
  useEffect(() => {
    // Check if YT API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API ready callback
    (window as any).onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [video.youtubeVideoId]);

  const initPlayer = () => {
    const newPlayer = new (window as any).YT.Player('youtube-player', {
      videoId: video.youtubeVideoId,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: showCustomControls ? 0 : 1, // Hide controls if using custom
        rel: 0,
        modestbranding: 1,
        start: video.lastPositionSeconds || 0,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handlePlayerStateChange,
      },
    });
    setPlayer(newPlayer);
    playerRef.current = newPlayer;
  };

  const handlePlayerReady = (event: any) => {
    setIsReady(true);
    const playerInstance = event.target;
    
    // Get initial duration
    const videoDuration = playerInstance.getDuration();
    setDuration(videoDuration);

    // Seek to last position if available
    if (video.lastPositionSeconds && video.lastPositionSeconds > 0) {
      playerInstance.seekTo(video.lastPositionSeconds, true);
      setCurrentTime(video.lastPositionSeconds);
    }

    // Set initial volume
    playerInstance.setVolume(volume);
  };

  const handlePlayerStateChange = (event: any) => {
    const state = event.data;
    const YT = (window as any).YT;

    if (state === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startProgressTracking();
    } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
      setIsPlaying(false);
      stopProgressTracking();
      
      // Save final progress
      if (playerRef.current) {
        const current = Math.floor(playerRef.current.getCurrentTime());
        const total = Math.floor(playerRef.current.getDuration());
        const completed = state === YT.PlayerState.ENDED;
        
        saveProgress(current, total, completed);
      }
    }
  };

  const startProgressTracking = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // ✅ Track progress every 10 seconds
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const current = Math.floor(playerRef.current.getCurrentTime());
          const total = Math.floor(playerRef.current.getDuration());

          // Update UI
          setCurrentTime(current);
          setDuration(total);

          // Only save if position changed by at least 5 seconds
          if (Math.abs(current - lastSavedPositionRef.current) >= 5) {
            saveProgress(current, total, false);
            lastSavedPositionRef.current = current;
          }

          // Notify parent component
          if (onProgressUpdate) {
            onProgressUpdate(current, total);
          }
        } catch (error) {
          console.warn('Error tracking progress:', error);
        }
      }
    }, 10000); // Every 10 seconds
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const saveProgress = (watchedSeconds: number, totalSeconds: number, completed: boolean) => {
    console.log('📊 Saving watch progress:', {
      videoId: video.id,
      watchedSeconds,
      totalSeconds,
      completed,
      percentage: totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0,
    });

    recordProgress({
      videoId: video.id,
      watchedSeconds,
      totalSeconds,
      completed,
    }, {
      onSuccess: () => {
        console.log('✅ Watch progress saved successfully');
      },
      onError: (error) => {
        console.error('❌ Failed to save watch progress:', error);
      },
    });
  };

  // ===== CUSTOM CONTROLS FUNCTIONS =====

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const changeVolume = (newVolume: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  };

  const goFullscreen = () => {
    const container = containerRef.current;
    if (container) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  const seekToChapter = (startTime: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startTime, true);
      playerRef.current.playVideo();
    }
  };

  // ===== RENDER =====

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => showCustomControls && setShowControls(true)}
      onMouseLeave={() => showCustomControls && setShowControls(false)}
    >
      {/* YouTube Player */}
      <div
        id="youtube-player"
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Loading State */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading video...</p>
          </div>
        </div>
      )}

      {/* Custom Controls (Optional) */}
      {showCustomControls && isReady && (
        <>
          {/* Chapter Markers on Progress Bar */}
          {chapters.length > 0 && (
            <div className="absolute bottom-16 left-0 right-0 h-1 bg-transparent pointer-events-none">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="absolute h-2 w-0.5 bg-yellow-400 cursor-pointer hover:w-1 pointer-events-auto"
                  style={{ 
                    left: `${duration > 0 ? (chapter.startTimeSeconds / duration) * 100 : 0}%`,
                    bottom: '0'
                  }}
                  onClick={() => seekToChapter(chapter.startTimeSeconds)}
                  title={chapter.title}
                />
              ))}
            </div>
          )}

          {/* Custom Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${getProgressPercentage()}%, #4b5563 ${getProgressPercentage()}%, #4b5563 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-white mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="text-white hover:text-blue-400 transition"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-blue-400 transition"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Time Display */}
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* Playback Speed */}
                <div className="relative group">
                  <button className="text-white hover:text-blue-400 transition flex items-center space-x-1">
                    <Settings size={20} />
                    <span className="text-sm">{playbackRate}x</span>
                  </button>
                  <div className="absolute bottom-full mb-2 right-0 bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`block px-4 py-2 text-white hover:bg-gray-700 w-full text-left ${
                          playbackRate === rate ? 'bg-blue-600' : ''
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={goFullscreen}
                  className="text-white hover:text-blue-400 transition"
                  aria-label="Fullscreen"
                >
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};