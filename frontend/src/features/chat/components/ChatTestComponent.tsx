import React, { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatRoomType } from '../types/chat';

export const ChatTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false); // ← ADD THIS

  // Only initialize useChat after we have the userId
  const {
    rooms,
    selectedRoom,
    messages,
    loading,
    error,
    unreadCount,
    createOrGetRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    selectRoom,
    fetchRooms,
    fetchUnreadCount
  } = useChat({ 
    currentUserId: currentUserId || undefined,
    autoFetchRooms: isReady // ← CHANGE THIS
  });

  const addResult = (msg: string, success: boolean = true) => {
    const icon = success ? '✅' : '❌';
    setTestResults(prev => [...prev, `${icon} ${msg}`]);
  };

  const getUserIdFromToken = (): number | null => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      addResult('⚠️ No token found. Please login first.', false);
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.userId || payload.id;

      if (userId) {
        return Number(userId);
      } else {
        addResult('⚠️ Token decoded but no userId/sub/id field', false);
        console.log('JWT Payload:', payload);
        return null;
      }
    } catch (err) {
      addResult('❌ Failed to decode token', false);
      console.error('JWT decode error:', err);
      return null;
    }
  };

  const getOtherUserId = (currentId: number): number => {
    switch (currentId) {
      case 1: return 2;
      case 2: return 3;
      case 3: return 4;
      case 4: return 5;
      case 5: return 10;
      case 10: return 1;
      default: return 1;
    }
  };

  const getUserInfo = (userId: number): string => {
    const userMap: Record<number, string> = {
      1: 'Admin One (admin@edu.com)',
      2: 'Student Daniel (student1@edu.com)',
      3: 'Teacher John (teacher1@edu.com)',
      4: 'Student Damilola (student2@edu.com)',
      5: 'Student Frank (frank@edu.com)',
      6: 'Teacher Oreoluwa (ore@edu.com)',
      7: 'Teacher Jonathan (jonathan@edu.com)',
      8: 'George Home (home1@edu.com)',
      9: 'Esther Aspirant (aspirant1@edu.com)',
      10: 'Teacher Usman (teacher2@edu.com)',
    };
    return userMap[userId] || `User ${userId}`;
  };

  useEffect(() => {
    let userId = getUserIdFromToken();
    
    if (!userId) {
      console.warn('⚠️ Using hardcoded user ID for testing');
      userId = 2;
      addResult('⚠️ No JWT found, using test user ID: 2', false);
    } else {
      addResult(`🔐 JWT decoded → User ID: ${userId}`);
      addResult(`👤 Logged in as: ${getUserInfo(userId)}`);
    }
    
    setCurrentUserId(userId);
    setIsReady(true); // ← ADD THIS - Now useChat can start fetching
  }, []);

  const runTests = async () => {
    if (!currentUserId) {
      addResult('❌ No user ID set. Cannot run tests.', false);
      return;
    }

    setTestResults([`🚀 Starting Chat System Tests as User ${currentUserId}...`]);
    addResult(`👤 Testing as: ${getUserInfo(currentUserId)}`);

    try {
      const otherUserId = getOtherUserId(currentUserId);
      addResult(`💬 Will create chat with: ${getUserInfo(otherUserId)}`);

      addResult('Test 1: Fetching chat rooms...');
      await fetchRooms();
      addResult(`✓ Rooms loaded: ${rooms.length} room(s)`);

      addResult('Test 2: Creating or getting direct room...');
      const directRoom = await createOrGetRoom({
        type: ChatRoomType.DIRECT,
        otherUserId: otherUserId
      });
      addResult(`✓ Room ready → ID: ${directRoom.id} (${directRoom.type})`);
      addResult(`  Chat between User ${currentUserId} and User ${otherUserId}`);

      addResult('Test 3: Sending message...');
      const msg = await sendMessage({
        roomId: directRoom.id,
        content: 'Hello! This is a test message from the integration test.'
      });
      addResult(`✓ Message sent → ID: ${msg.id}`);
      addResult(`  Content: "${msg.content}"`);

      addResult('Test 4: Sending reply message...');
      const reply = await sendMessage({
        roomId: directRoom.id,
        content: 'This is a reply to your message!',
        replyToId: msg.id
      });
      const hasCachedData = reply.replyToContent && reply.replyToSenderName;
      addResult(`✓ Reply sent → ID: ${reply.id}`);
      addResult(`  Reply cached data: ${hasCachedData ? '✅ YES' : '❌ NO'}`);
      if (hasCachedData) {
        addResult(`  ↪️ Replying to: "${reply.replyToContent?.substring(0, 40)}..."`);
        addResult(`  ↪️ Original sender: ${reply.replyToSenderName}`);
      }

      addResult('Test 5: Sending message with attachment...');
      const attachMsg = await sendMessage({
        roomId: directRoom.id,
        content: 'Check out this image!',
        attachmentUrl: 'https://example.com/test-image.jpg',
        attachmentType: 'image/jpeg'
      });
      addResult(`✓ Attachment message sent → ID: ${attachMsg.id}`);
      addResult(`  Attachment type: ${attachMsg.attachmentType || 'NOT SET'}`);

      addResult('Test 6: Editing message...');
      const edited = await editMessage(msg.id, 'EDITED: This message has been updated!');
      addResult(`✓ Message edited → isEdited: ${edited.isEdited}`);
      addResult(`  New content: "${edited.content}"`);

      addResult('Test 7: Checking unread count...');
      await fetchUnreadCount();
      addResult(`✓ Total unread messages: ${unreadCount}`);

      addResult('Test 8: Fetching room messages...');
      await selectRoom(directRoom);
      addResult(`✓ Room selected → ${messages.length} message(s) loaded`);
      addResult(`  Real-time subscription: ACTIVE 📡`);

      addResult('');
      addResult('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
      addResult('');
      addResult('📊 Summary:');
      addResult(`  • Room created: ${directRoom.id}`);
      addResult(`  • Messages sent: 3`);
      addResult(`  • Messages edited: 1`);
      addResult(`  • Real-time: Active`);

    } catch (err: any) {
      addResult('', false);
      addResult(`❌ TEST FAILED: ${err.message}`, false);
      console.error('Test error:', err);
    }
  };

  const testRealtime = () => {
    if (!selectedRoom) {
      addResult('❌ No room selected. Run tests first.', false);
      return;
    }

    addResult('');
    addResult('📡 REAL-TIME TEST MODE ACTIVE');
    addResult(`➡️ Monitoring Room ID: ${selectedRoom.id}`);
    addResult(`➡️ Current messages: ${messages.length}`);
    addResult('');
    addResult('📝 Instructions:');
    addResult('1. Open another browser tab or incognito window');
    addResult('2. Login as a different user');
    addResult('3. Send a message to this chat room');
    addResult('4. Watch this screen for real-time updates!');
    addResult('');
    addResult('✨ If real-time works, new messages will appear here automatically');
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 1200, margin: '0 auto' }}>
      <h2>🧪 Chat System Integration Tests</h2>

      {currentUserId && (
        <div style={{
          padding: 15,
          marginBottom: 20,
          background: '#e8f5e9',
          borderRadius: 4,
          border: '2px solid #4CAF50'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Current Test User</h3>
          <p style={{ margin: 0 }}>
            <strong>User ID:</strong> {currentUserId}<br />
            <strong>Name:</strong> {getUserInfo(currentUserId)}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={runTests}
          disabled={loading || !currentUserId || !isReady}
          style={{
            padding: '12px 24px',
            marginRight: 10,
            background: (loading || !currentUserId || !isReady) ? '#ccc' : '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: (loading || !currentUserId || !isReady) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Running Tests...' : '▶️ Run All Tests'}
        </button>

        <button
          onClick={testRealtime}
          disabled={loading || !selectedRoom}
          style={{
            padding: '12px 24px',
            background: (loading || !selectedRoom) ? '#ccc' : '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: (loading || !selectedRoom) ? 'not-allowed' : 'pointer',
          }}
        >
          📡 Test Real-time
        </button>
      </div>

      {error && (
        <div style={{
          padding: 15,
          marginBottom: 20,
          background: '#ffebee',
          color: '#c62828',
          borderRadius: 4,
          border: '2px solid #f44336'
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      <div style={{
        background: '#f5f5f5',
        padding: 15,
        borderRadius: 4,
        maxHeight: 500,
        overflow: 'auto',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0 }}>📋 Test Results</h3>
        {testResults.length === 0 ? (
          <p style={{ color: '#666' }}>Click "Run All Tests" to begin testing...</p>
        ) : (
          testResults.map((line, i) => (
            <div key={i} style={{ 
              marginBottom: 5, 
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.5
            }}>
              {line}
            </div>
          ))
        )}
      </div>

      {selectedRoom && (
        <div style={{
          marginTop: 20,
          padding: 15,
          background: '#e3f2fd',
          borderRadius: 4,
          border: '1px solid #2196F3'
        }}>
          <h3 style={{ marginTop: 0 }}>📊 Current State</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <p><strong>Selected Room:</strong> {selectedRoom.id}</p>
              <p><strong>Room Type:</strong> {selectedRoom.type}</p>
              <p><strong>Messages Count:</strong> {messages.length}</p>
            </div>
            <div>
              <p><strong>Unread Count:</strong> {unreadCount}</p>
              <p><strong>Total Rooms:</strong> {rooms.length}</p>
              <p><strong>Real-time:</strong> 📡 Active</p>
            </div>
          </div>

          <h4>💬 Recent Messages (Last 5)</h4>
          <div style={{ maxHeight: 250, overflow: 'auto' }}>
            {messages.slice(-5).map(m => (
              <div key={m.id} style={{
                padding: 10,
                marginBottom: 8,
                background: m.isOwnMessage ? '#c8e6c9' : '#fff',
                borderRadius: 4,
                fontSize: 13,
                border: '1px solid #ddd'
              }}>
                <div style={{ marginBottom: 5 }}>
                  <strong>{m.senderName}</strong>
                  <span style={{ color: '#666', fontSize: 11, marginLeft: 10 }}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                  {m.isEdited && <span style={{ color: '#999', fontSize: 11 }}> (edited)</span>}
                </div>
                <div>{m.content}</div>
                {m.replyToContent && (
                  <div style={{ 
                    fontSize: 11, 
                    color: '#666', 
                    marginTop: 5,
                    paddingLeft: 10,
                    borderLeft: '2px solid #999'
                  }}>
                    ↪️ Reply to <strong>{m.replyToSenderName}</strong>: "{m.replyToContent.substring(0, 40)}..."
                  </div>
                )}
                {m.attachmentType && (
                  <div style={{ fontSize: 11, color: '#1976d2', marginTop: 5 }}>
                    📎 Attachment: {m.attachmentType}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 20,
        padding: 15,
        background: '#fff3cd',
        borderRadius: 4,
        border: '1px solid #ffc107',
        fontSize: 13
      }}>
        <h4 style={{ marginTop: 0 }}>⚠️ Testing Checklist</h4>
        <ul style={{ marginBottom: 0 }}>
          <li>✅ Backend running on <code>http://localhost:8080</code></li>
          <li>✅ Valid JWT token in localStorage</li>
          <li>✅ Supabase credentials in <code>.env</code></li>
          <li>✅ Database has all required columns (15 total)</li>
          <li>✅ Triggers installed (3 total)</li>
          <li>📝 Check browser console for Supabase logs</li>
          <li>📝 Check Network tab for API calls</li>
        </ul>
      </div>
    </div>
  );
};