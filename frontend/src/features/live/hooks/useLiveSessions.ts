import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as sessionsApi from '../api/sessionsApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

// ✅ Main hook for fetching sessions with support for multi-status
export const useLiveSessions = (
  params?: Parameters<typeof sessionsApi.getSessions>[0]
) => {
  console.log('🔍 useLiveSessions called with params:', params);

  return useQuery({
    queryKey: ['sessions', params],
    queryFn: async () => {
      console.log('📡 Fetching sessions with params:', params);
      const response = await sessionsApi.getSessions(params);
      console.log('✅ Sessions fetched:', response.data);
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds to catch status changes
    staleTime: 10000, // Data is stale after 10 seconds
  });
};

export const useSessionDetails = (id: number | null) => {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () =>
      sessionsApi.getSessionDetails(id!).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 5000, // More frequent updates for active sessions
    staleTime: 2000,
  });
};

export const useUpcomingSessions = () => {
  return useQuery({
    queryKey: ['sessions', 'upcoming'],
    queryFn: () =>
      sessionsApi.getUpcomingSessions().then((res) => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.createSession,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'upcoming'] });
      toast.success('Session created successfully!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to create session'
      );
    },
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof sessionsApi.updateSession>[1];
    }) => sessionsApi.updateSession(id, data),
    onSuccess: (response, { id }) => {
      queryClient.setQueryData(['session', id], response.data);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'upcoming'] });
      toast.success('Session updated successfully!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to update session'
      );
    },
  });
};

export const useAttendance = (sessionId: number | null) => {
  return useQuery({
    queryKey: ['attendance', sessionId],
    queryFn: () =>
      sessionsApi.getAttendance(sessionId!).then((res) => res.data),
    enabled: !!sessionId,
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance marked!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to mark attendance'
      );
    },
  });
};

// ✅ Enhanced: Start session and keep it visible for students
export const useStartSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.startSession,
    onSuccess: (response, sessionId) => {
      // Update the specific session in cache
      queryClient.setQueryData(['session', sessionId], response.data);

      // Invalidate all sessions queries to refresh
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'upcoming'] });

      toast.success('Session started!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to start session'
      );
    },
  });
};

// ✅ Enhanced: End session and remove from student view
export const useEndSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.endSession,
    onSuccess: (response, sessionId) => {
      // Update cache with ended session
      queryClient.setQueryData(['session', sessionId], response.data);

      // Invalidate all sessions queries - this will trigger refetch
      // and filter out ENDED sessions from student view
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'upcoming'] });

      toast.success('Session ended');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to end session'
      );
    },
  });
};

// ✅ Enhanced: Cancel session and remove from all views
export const useCancelSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.cancelSession,
    onSuccess: (response, sessionId) => {
      // Invalidate all session-related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });

      toast.success('Session cancelled');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to cancel session'
      );
    },
  });
};

// ✅ Role-aware wrapper hook
export const useRoleAwareSessions = (
  params?: Parameters<typeof sessionsApi.getSessions>[0]
) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.roles?.[0];

  // All roles use the same hook, but params are role-aware
  return useLiveSessions(params);
};