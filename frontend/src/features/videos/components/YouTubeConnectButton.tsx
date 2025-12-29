import React from 'react';
import { Youtube, CheckCircle, Loader, XCircle } from 'lucide-react';
import { useYouTubeAuthStatus, useConnectYouTube, useDisconnectYouTube } from '../hooks/useYouTubeAuth';

export const YouTubeConnectButton: React.FC = () => {
  const { data: authStatus, isLoading } = useYouTubeAuthStatus();
  const { connect, isConnecting } = useConnectYouTube();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectYouTube();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  // Connected State
  if (authStatus?.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-green-900 mb-1">
                YouTube Connected
              </h4>
              {authStatus.channelName && (
                <div className="space-y-1">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Channel:</span> {authStatus.channelName}
                  </p>
                  {authStatus.channelId && (
                    <p className="text-xs text-green-600">
                      ID: {authStatus.channelId}
                    </p>
                  )}
                </div>
              )}
              {authStatus.connectedAt && (
                <p className="text-xs text-green-600 mt-2">
                  Connected on {new Date(authStatus.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to disconnect your YouTube account?')) {
                disconnect();
              }
            }}
            disabled={isDisconnecting}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
          >
            {isDisconnecting ? (
              <>
                <Loader className="animate-spin" size={16} />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <XCircle size={16} />
                <span>Disconnect</span>
              </>
            )}
          </button>
        </div>

        {authStatus.expiresAt && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-xs text-green-600">
              Token expires: {new Date(authStatus.expiresAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Not Connected State
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Youtube className="text-red-600" size={24} />
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">
            Connect Your YouTube Account
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Videos will be uploaded to your YouTube channel for secure hosting and streaming.
            We'll never post to your channel without permission.
          </p>
          
          <ul className="space-y-2 mb-4">
            <li className="flex items-center text-sm text-gray-600">
              <CheckCircle className="text-green-500 mr-2" size={16} />
              <span>Upload videos directly to YouTube</span>
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <CheckCircle className="text-green-500 mr-2" size={16} />
              <span>Automatic video processing and transcoding</span>
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <CheckCircle className="text-green-500 mr-2" size={16} />
              <span>High-quality streaming for students</span>
            </li>
          </ul>

          <button
            onClick={connect}
            disabled={isConnecting}
            className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Youtube size={20} />
                <span>Connect with YouTube</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-3 text-center">
            By connecting, you agree to YouTube's Terms of Service
          </p>
        </div>
      </div>

      {authStatus?.authUrl && (
        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Note:</span> A popup window will open for authentication.
            Please allow popups for this site.
          </p>
        </div>
      )}
    </div>
  );
};