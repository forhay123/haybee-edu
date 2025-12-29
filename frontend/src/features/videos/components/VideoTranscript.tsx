import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, Copy, CheckCircle } from 'lucide-react';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface VideoTranscriptProps {
  transcript: {
    transcript: string;
    segments: TranscriptSegment[];
    language: string;
  };
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export const VideoTranscript: React.FC<VideoTranscriptProps> = ({
  transcript,
  currentTime = 0,
  onSeek,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to current segment
  useEffect(() => {
    const currentIndex = transcript.segments.findIndex(
      (seg) => currentTime >= seg.start && currentTime < seg.end
    );
    if (currentIndex !== -1) {
      setHighlightedIndex(currentIndex);
      segmentRefs.current[currentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime, transcript.segments]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([transcript.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSegments = transcript.segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {copied ? (
              <>
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span className="text-sm">Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Download size={16} />
            <span className="text-sm">Download</span>
          </button>
        </div>
      </div>

      {/* Language Badge */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Language: <span className="font-medium">{transcript.language}</span>
        </span>
        {searchQuery && (
          <span>
            {filteredSegments.length} of {transcript.segments.length} segments
          </span>
        )}
      </div>

      {/* Transcript Segments */}
      <div className="max-h-[500px] overflow-y-auto space-y-3 border rounded-lg p-4 bg-gray-50">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No matching segments found</p>
          </div>
        ) : (
          filteredSegments.map((segment, index) => {
            const actualIndex = transcript.segments.indexOf(segment);
            const isHighlighted = highlightedIndex === actualIndex;
            const isSearchMatch = searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={actualIndex}
                ref={(el) => (segmentRefs.current[actualIndex] = el)}
                className={`flex space-x-3 p-3 rounded-lg transition-colors ${
                  isHighlighted
                    ? 'bg-blue-100 border-l-4 border-blue-500'
                    : isSearchMatch
                    ? 'bg-yellow-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Timestamp */}
                <button
                  onClick={() => onSeek?.(segment.start)}
                  className={`flex-shrink-0 font-mono text-sm px-2 py-1 rounded transition ${
                    isHighlighted
                      ? 'text-blue-700 bg-blue-200 hover:bg-blue-300'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {formatTime(segment.start)}
                </button>

                {/* Text */}
                <p
                  className={`flex-1 text-sm leading-relaxed ${
                    isHighlighted ? 'text-blue-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  {searchQuery ? (
                    <HighlightText text={segment.text} highlight={searchQuery} />
                  ) : (
                    segment.text
                  )}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Helper component to highlight search matches
const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};