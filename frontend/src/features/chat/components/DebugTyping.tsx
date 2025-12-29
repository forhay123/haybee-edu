import React from 'react';

interface DebugTypingProps {
  typingUsers: string[];
  wsConnected: boolean;
  roomId: number;
}

export const DebugTyping: React.FC<DebugTypingProps> = ({ typingUsers, wsConnected, roomId }) => {
  return (
    <div className="fixed bottom-20 right-4 bg-yellow-100 border-2 border-yellow-500 p-4 rounded-lg shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-yellow-900 mb-2">🐛 Typing Debug</h3>
      <div className="text-sm space-y-1">
        <div>
          <strong>WS Connected:</strong> {wsConnected ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Room ID:</strong> {roomId}
        </div>
        <div>
          <strong>Typing Users Count:</strong> {typingUsers.length}
        </div>
        <div>
          <strong>Typing Users:</strong>
          {typingUsers.length > 0 ? (
            <ul className="list-disc ml-4">
              {typingUsers.map((user, idx) => (
                <li key={idx}>"{user}"</li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-500"> None</span>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Open browser console (F12) to see WebSocket logs
        </div>
      </div>
    </div>
  );
};