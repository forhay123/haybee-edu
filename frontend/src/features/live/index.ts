// ===== src/features/live/index.ts =====
// API
export * from './api/sessionsApi';

// Components
export { CreateSessionModal } from './components/CreateSessionModal';
export { SessionCard } from './components/SessionCard';
export { SessionList } from './components/SessionList';
export { JoinSessionButton } from './components/JoinSessionButton';
export { SessionStatusBadge } from './components/SessionStatusBadge';
export { UpcomingSessionsWidget } from './components/UpcomingSessionsWidget';

// Hooks
export * from './hooks/useLiveSessions';
// Hooks
export {
  useLiveSessions,
  useSessionDetails,
  useUpcomingSessions,
  useCreateSession,
  useUpdateSession,
  useAttendance,
  useMarkAttendance,
} from './hooks/useLiveSessions';

export {
  useStartSession,
  useEndSession,
  useCancelSession,
} from './hooks/useStartEndSession';


// Pages
export { LiveClassesPage } from './pages/LiveClassesPage';
export { SessionDetailsPage } from './pages/SessionDetailsPage';
export { CreateSessionPage } from './pages/CreateSessionPage';
