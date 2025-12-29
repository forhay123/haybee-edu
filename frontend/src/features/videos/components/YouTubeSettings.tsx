// src/features/videos/components/YouTubeSettings.tsx
import React from 'react';
import { Youtube, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useYouTubeAuthStatus, useDisconnectYouTube } from '../hooks/useYouTubeAuth';

export const YouTubeSettings: React.FC = () => {
  const { data: authStatus, isLoading } = useYouTubeAuthStatus();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectYouTube();

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect your YouTube account? You will need to reconnect to upload videos.')) {
      disconnect();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <Youtube className="text-red-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            YouTube Integration
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Youtube className="text-red-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            YouTube Integration
          </h3>
        </div>
        
        {/* Status Badge */}
        {authStatus?.connected ? (
          <span className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
            <CheckCircle size={16} />
            <span>Connected</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 rounded-full text-sm font-medium">
            <XCircle size={16} />
            <span>Not Connected</span>
          </span>
        )}
      </div>

      {/* Connection Details */}
      {authStatus?.connected ? (
        <div className="space-y-4">
          {/* Channel Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Channel Name
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {authStatus.channelName || 'Unknown Channel'}
                </p>
              </div>
              
              {authStatus.channelId && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Channel ID
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {authStatus.channelId}
                  </p>
                </div>
              )}

              {authStatus.connectedAt && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Connected Since
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(authStatus.connectedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Warning for expired tokens */}
          {authStatus.expired && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                ⚠️ Your YouTube connection has expired. Please reconnect to continue uploading videos.
              </p>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect YouTube'}</span>
          </button>

          {/* Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Disconnecting will remove access to your YouTube channel. You can reconnect anytime.
          </p>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your YouTube account to upload video lessons directly from the platform.
          </p>
        </div>
      )}
    </div>
  );
};