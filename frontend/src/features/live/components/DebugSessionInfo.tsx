// src/features/live/components/DebugSessionInfo.tsx
// ⚠️ TEMPORARY DEBUG COMPONENT - Remove after fixing the issue

import React from 'react';
import { SessionDetailsDto } from '../api/sessionsApi';

interface DebugSessionInfoProps {
  session: SessionDetailsDto;
  userId?: number;
}

export const DebugSessionInfo: React.FC<DebugSessionInfoProps> = ({ session, userId }) => {
  const isOwnSession = session.teacherId === userId;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-yellow-900 mb-2">🐛 DEBUG INFO (Remove this component after fixing)</h3>
      
      <div className="space-y-1 text-sm font-mono">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-bold">Session ID:</span> {session.id}
          </div>
          <div>
            <span className="font-bold">Status:</span>{' '}
            <span className={session.status === 'LIVE' ? 'text-green-600 font-bold' : ''}>
              {session.status}
            </span>
          </div>
          
          <div>
            <span className="font-bold">Teacher ID:</span> {session.teacherId}
          </div>
          <div>
            <span className="font-bold">Current User ID:</span> {userId || 'undefined'}
          </div>
          
          <div>
            <span className="font-bold">Is Own Session:</span>{' '}
            <span className={isOwnSession ? 'text-green-600' : 'text-red-600'}>
              {isOwnSession ? '✅ YES' : '❌ NO'}
            </span>
          </div>
          <div>
            <span className="font-bold">Has StartUrl:</span>{' '}
            <span className={session.startUrl ? 'text-green-600' : 'text-red-600'}>
              {session.startUrl ? '✅ YES' : '❌ NO'}
            </span>
          </div>

          <div className="col-span-2">
            <span className="font-bold">StartUrl:</span>{' '}
            <span className="text-xs break-all">
              {session.startUrl || '❌ Missing'}
            </span>
          </div>

          <div className="col-span-2">
            <span className="font-bold">JoinUrl:</span>{' '}
            <span className="text-xs break-all">
              {session.joinUrl || '❌ Missing'}
            </span>
          </div>
        </div>

        <div className="mt-3 p-2 bg-white rounded border border-yellow-300">
          <div className="font-bold mb-1">Expected Behavior:</div>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Status should be: <span className="font-bold text-green-600">LIVE</span></li>
            <li>Is Own Session should be: <span className="font-bold text-green-600">✅ YES</span></li>
            <li>Has StartUrl should be: <span className="font-bold text-green-600">✅ YES</span></li>
          </ul>
          
          {session.status === 'LIVE' && isOwnSession && session.startUrl && (
            <div className="mt-2 text-green-700 font-bold">
              ✅ All conditions met! "Join as Host" button should be visible.
            </div>
          )}
          
          {session.status !== 'LIVE' && (
            <div className="mt-2 text-red-700 font-bold">
              ❌ Problem: Status is "{session.status}" but should be "LIVE"
            </div>
          )}
          
          {!isOwnSession && (
            <div className="mt-2 text-red-700 font-bold">
              ❌ Problem: This is not your session (Teacher ID mismatch)
            </div>
          )}
          
          {!session.startUrl && (
            <div className="mt-2 text-red-700 font-bold">
              ❌ Problem: Backend is not returning startUrl
            </div>
          )}
        </div>

        <div className="mt-3">
          <button
            onClick={() => {
              console.log('📋 Full Session Object:', session);
              alert('Check browser console for full session object');
            }}
            className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300"
          >
            Log Full Session Object to Console
          </button>
        </div>
      </div>
    </div>
  );
};