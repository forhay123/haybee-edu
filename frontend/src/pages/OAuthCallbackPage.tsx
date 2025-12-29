// ===== src/pages/OAuthCallbackPage.tsx =====
import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as youtubeApi from '../features/videos/api/youtubeApi';

/**
 * ✅ OAuth Callback Handler
 * This page receives the OAuth redirect from Google with code & state params
 * 
 * CRITICAL: Must only call exchange endpoint ONCE to avoid race conditions
 */
const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasProcessed = useRef(false); // ✅ Prevents double-execution

  useEffect(() => {
    // ✅ Guard: Only process once
    if (hasProcessed.current) {
      console.log('[OAuth Callback] Already processed, skipping');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth error
    if (error) {
      console.error('[OAuth Callback] Error:', error, errorDescription);
      
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'oauth-error',
            error: errorDescription || error,
          },
          window.location.origin
        );
      }

      // Show error and redirect
      toast.error(errorDescription || 'YouTube connection failed');
      setTimeout(() => {
        window.close();
        navigate('/videos/upload');
      }, 2000);
      return;
    }

    // Validate required params
    if (!code || !state) {
      console.error('[OAuth Callback] Missing code or state');
      
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'oauth-error',
            error: 'Missing OAuth parameters',
          },
          window.location.origin
        );
      }

      toast.error('Invalid OAuth response');
      setTimeout(() => {
        window.close();
        navigate('/videos/upload');
      }, 2000);
      return;
    }

    // ✅ Mark as processed BEFORE making the API call
    hasProcessed.current = true;
    console.log('[OAuth Callback] Processing code exchange...');

    // Exchange code for tokens
    youtubeApi
      .exchangeOAuthCode(code, state)
      .then((response) => {
        console.log('[OAuth Callback] ✅ Exchange successful', response.data);

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth-complete',
              data: response.data,
            },
            window.location.origin
          );
        }

        // Success message
        toast.success('YouTube connected successfully!');

        // Close popup and redirect
        setTimeout(() => {
          window.close();
          
          // Fallback if window.close() doesn't work
          if (!window.closed) {
            navigate('/videos/upload');
          }
        }, 1500);
      })
      .catch((error) => {
        console.error('[OAuth Callback] ❌ Exchange failed:', error);

        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Failed to connect YouTube account';

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth-error',
              error: errorMessage,
            },
            window.location.origin
          );
        }

        toast.error(errorMessage);

        // Close popup and redirect
        setTimeout(() => {
          window.close();
          
          if (!window.closed) {
            navigate('/videos/upload');
          }
        }, 2000);
      });
  }, []); // ✅ Empty dependency array - only run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Connecting YouTube...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we complete the connection
        </p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;