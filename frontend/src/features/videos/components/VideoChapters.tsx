import React, { useState } from 'react';
import { Play, ChevronRight, Clock, ChevronDown } from 'lucide-react';

interface Chapter {
  id?: number;
  chapterNumber: number;
  title: string;
  startTimeSeconds: number; // ✅ Changed from startTime
  endTimeSeconds: number; // ✅ Changed from endTime
  summary?: string;
  keyConcepts?: string[];
}

interface VideoChaptersProps {
  chapters: Chapter[];
  onChapterClick: (startTime: number) => void;
  currentTime?: number;
  compact?: boolean;
}

export const VideoChapters: React.FC<VideoChaptersProps> = ({
  chapters,
  onChapterClick,
  currentTime = 0,
  compact = false,
}) => {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDuration = (start: number, end: number) => {
    const duration = end - start;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}m ${secs}s`;
  };

  const isCurrentChapter = (chapter: Chapter) => {
    return currentTime >= chapter.startTimeSeconds && currentTime < chapter.endTimeSeconds;
  };

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No chapters available for this video</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'max-h-[600px] overflow-y-auto'}`}>
      {chapters.map((chapter) => {
        const isCurrent = isCurrentChapter(chapter);
        const isExpanded = expandedChapter === chapter.chapterNumber;

        return (
          <div
            key={chapter.chapterNumber}
            className={`border rounded-lg transition-all ${
              isCurrent
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Chapter Header */}
            <div className="flex items-center">
              <button
                onClick={() => onChapterClick(chapter.startTimeSeconds)}
                className="flex-1 p-4 text-left flex items-center space-x-3 group"
              >
                {/* Chapter Number */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}
                >
                  {chapter.chapterNumber}
                </div>

                {/* Chapter Info */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium truncate ${
                      isCurrent ? 'text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {chapter.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      {formatTime(chapter.startTimeSeconds)}
                    </span>
                    <span>•</span>
                    <span>{getDuration(chapter.startTimeSeconds, chapter.endTimeSeconds)}</span>
                  </div>
                </div>

                {/* Play Icon */}
                <div
                  className={`flex-shrink-0 ${
                    isCurrent ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                  }`}
                >
                  <Play size={20} fill={isCurrent ? 'currentColor' : 'none'} />
                </div>
              </button>

              {/* Expand Button (if has summary or key concepts) */}
              {!compact && (chapter.summary || chapter.keyConcepts) && (
                <button
                  onClick={() =>
                    setExpandedChapter(isExpanded ? null : chapter.chapterNumber)
                  }
                  className="p-4 text-gray-400 hover:text-gray-600 transition"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              )}
            </div>

            {/* Expanded Content */}
            {!compact && isExpanded && (chapter.summary || chapter.keyConcepts) && (
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                {/* Summary */}
                {chapter.summary && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Summary</h5>
                    <p className="text-sm text-gray-600">{chapter.summary}</p>
                  </div>
                )}

                {/* Key Concepts */}
                {chapter.keyConcepts && chapter.keyConcepts.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Key Concepts</h5>
                    <div className="flex flex-wrap gap-2">
                      {chapter.keyConcepts.map((concept, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};