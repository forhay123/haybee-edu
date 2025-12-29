// ===== src/hooks/useYouTubeAuth.ts =====
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as youtubeApi from '../api/youtubeApi';

/**
 * ✅ Check YouTube connection status
 * Endpoint: GET /api/v1/oauth/youtube/auth/status
 */
export const useYouTubeAuthStatus = () => {
  return useQuery({
    queryKey: ['youtube-auth'],
    queryFn: () => youtubeApi.getYouTubeAuthStatus().then(res => res.data),
    retry: 2,
  });
};

/**
 * ✅ Connect YouTube (OAuth flow)
 * Endpoint: GET /api/v1/oauth/youtube/auth/initiate → Returns OAuth URL
 * 
 * Uses postMessage pattern (not polling window.closed)
 * to avoid COEP (Cross-Origin-Opener-Policy) errors
 */
export const useConnectYouTube = () => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = () => {
    setIsConnecting(true);
    
    youtubeApi
      .getYouTubeAuthUrl()
      .then((response) => {
        const authUrl = response.data.authUrl;
        
        console.log('[OAuth] Opening popup to:', authUrl);
        
        // Open OAuth window
        const authWindow = window.open(
          authUrl,
          'youtube-auth',
          'width=500,height=700,left=200,top=200'
        );

        if (!authWindow) {
          toast.error('Popup blocked! Please allow popups for this site.');
          setIsConnecting(false);
          return;
        }

        // ✅ Use postMessage instead of polling window.closed
        // This avoids COEP errors and works reliably
        const handleOAuthMessage = (event) => {
          // Verify message came from our OAuth popup
          if (event.source !== authWindow) return;
          
          console.log('[OAuth] Received message:', event.data);
          
          // OAuth success
          if (event.data?.type === 'oauth-complete') {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleOAuthMessage);
            setIsConnecting(false);
            
            // Refresh auth status
            queryClient.invalidateQueries({ queryKey: ['youtube-auth'] });
            toast.success('YouTube connected successfully!');
            console.log('[OAuth] ✅ Connection successful');
          } 
          // OAuth error
          else if (event.data?.type === 'oauth-error') {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleOAuthMessage);
            setIsConnecting(false);
            toast.error(event.data.error || 'YouTube connection failed');
            console.error('[OAuth] ❌ Error:', event.data.error);
          }
        };

        window.addEventListener('message', handleOAuthMessage);

        // Safety timeout (10 minutes)
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', handleOAuthMessage);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setIsConnecting(false);
          toast.error('OAuth timeout - Please try again');
          console.warn('[OAuth] ⏱️ Timeout - no response after 10 minutes');
        }, 10 * 60 * 1000);

        console.log('[OAuth] Waiting for message from popup...');
      })
      .catch((error) => {
        setIsConnecting(false);
        console.error('[OAuth] Error getting auth URL:', error);
        toast.error(
          error.response?.data?.message || 'Failed to initiate YouTube connection'
        );
      });
  };

  return { connect, isConnecting };
};

/**
 * ✅ Disconnect YouTube
 * Endpoint: DELETE /api/v1/oauth/youtube/auth/disconnect
 */
export const useDisconnectYouTube = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: youtubeApi.disconnectYouTube,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['youtube-auth'] });
      toast.success(data.message || 'YouTube disconnected');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to disconnect YouTube'
      );
    },
  });
};

/**
 * ✅ Upload video
 * Endpoint: POST /api/v1/youtube/videos/upload
 */
export const useUploadVideo = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      youtubeApi.uploadVideo(formData, (progress) => {
        setUploadProgress(progress);
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-auth'] });
      setUploadProgress(100);
      toast.success('Video uploaded! Processing in progress...');
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast.error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Upload failed'
      );
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
    reset: () => {
      mutation.reset();
      setUploadProgress(0);
    },
  };
};