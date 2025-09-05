import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/appStore';
import '../ui/CollaborationSystem.css';

interface CollaborationUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string; // Selected object ID
  isActive: boolean;
  lastSeen: Date;
}

interface CollaborationMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'edit';
}

interface VersionHistory {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  description: string;
  projectSnapshot?: any;
}

const CollaborationSystem: React.FC = () => {
  const { currentProject } = useAppStore();
  const [isCollaborationEnabled, setIsCollaborationEnabled] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const [chatMessages, setChatMessages] = useState<CollaborationMessage[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [currentUser] = useState<CollaborationUser>({
    id: 'user-1',
    name: 'You',
    avatar: '👤',
    color: '#007bff',
    isActive: true,
    lastSeen: new Date()
  });
  
  const [showChat, setShowChat] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Simulated collaboration users
  const mockUsers: CollaborationUser[] = [
    {
      id: 'user-2',
      name: 'Alice Johnson',
      avatar: '👩‍💼',
      color: '#28a745',
      cursor: { x: 150, y: 200 },
      selection: undefined,
      isActive: true,
      lastSeen: new Date()
    },
    {
      id: 'user-3',
      name: 'Bob Smith',
      avatar: '👨‍🎨',
      color: '#dc3545',
      cursor: { x: 300, y: 150 },
      selection: 'object-123',
      isActive: true,
      lastSeen: new Date()
    },
    {
      id: 'user-4',
      name: 'Carol Davis',
      avatar: '👩‍🔬',
      color: '#ffc107',
      isActive: false,
      lastSeen: new Date(Date.now() - 5 * 60000) // 5 minutes ago
    }
  ];

  // Initialize collaboration
  const startCollaboration = () => {
    if (!currentProject) {
      alert('Please open a project first');
      return;
    }

    setConnectionStatus('connecting');
    
    // Simulate WebSocket connection
    setTimeout(() => {
      setSessionId(`session-${Date.now()}`);
      setConnectedUsers([currentUser, ...mockUsers.filter(u => u.isActive)]);
      setConnectionStatus('connected');
      setIsCollaborationEnabled(true);
      
      // Add system message
      addSystemMessage('Collaboration session started');
      
      // Simulate existing version history
      setVersionHistory([
        {
          id: 'v1',
          timestamp: new Date(Date.now() - 3600000),
          userId: 'user-2',
          userName: 'Alice Johnson',
          action: 'create',
          description: 'Created new project'
        },
        {
          id: 'v2',
          timestamp: new Date(Date.now() - 1800000),
          userId: 'user-3',
          userName: 'Bob Smith',
          action: 'edit',
          description: 'Added title text'
        },
        {
          id: 'v3',
          timestamp: new Date(Date.now() - 900000),
          userId: 'user-1',
          userName: 'You',
          action: 'edit',
          description: 'Updated background color'
        }
      ]);
    }, 1500);
  };

  const stopCollaboration = () => {
    setIsCollaborationEnabled(false);
    setSessionId(null);
    setConnectedUsers([]);
    setConnectionStatus('disconnected');
    addSystemMessage('Collaboration session ended');
  };

  const addSystemMessage = (message: string) => {
    const systemMessage: CollaborationMessage = {
      id: `msg-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    };
    setChatMessages(prev => [...prev, systemMessage]);
  };

  const sendChatMessage = () => {
    if (!newMessage.trim()) return;

    const message: CollaborationMessage = {
      id: `msg-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      message: newMessage,
      timestamp: new Date(),
      type: 'chat'
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate receiving responses
    if (Math.random() > 0.7) {
      setTimeout(() => {
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const responses = [
          'Looks good!',
          'I agree with that change',
          'Let me work on the animation',
          'Should we try a different color?',
          'Perfect timing!',
          'I\'ll handle the audio'
        ];
        
        const response: CollaborationMessage = {
          id: `msg-${Date.now()}-response`,
          userId: randomUser.id,
          userName: randomUser.name,
          message: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          type: 'chat'
        };
        setChatMessages(prev => [...prev, response]);
      }, 1000 + Math.random() * 2000);
    }
  };

  const shareProject = () => {
    const shareLink = `https://scribbeanim.com/collaborate/${sessionId}`;
    navigator.clipboard.writeText(shareLink);
    alert(`Share link copied to clipboard:\n${shareLink}`);
  };

  const exportHistory = () => {
    const historyData = JSON.stringify(versionHistory, null, 2);
    const blob = new Blob([historyData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-history-${currentProject?.name || 'untitled'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isCollaborationEnabled) return;

    const interval = setInterval(() => {
      // Simulate user cursor movements
      setConnectedUsers(prev => prev.map(user => {
        if (user.id === currentUser.id) return user;
        
        return {
          ...user,
          cursor: user.cursor ? {
            x: Math.max(0, Math.min(800, user.cursor.x + (Math.random() - 0.5) * 20)),
            y: Math.max(0, Math.min(600, user.cursor.y + (Math.random() - 0.5) * 20))
          } : undefined
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCollaborationEnabled, currentUser.id]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      default: return '🔴';
    }
  };

  return (
    <div className="collaboration-system">
      <div className="collaboration-header">
        <h3>Real-time Collaboration</h3>
        <div className="connection-status">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{connectionStatus}</span>
        </div>
      </div>

      {!isCollaborationEnabled ? (
        <div className="collaboration-start">
          <div className="start-content">
            <div className="feature-list">
              <h4>Collaboration Features:</h4>
              <ul>
                <li>✅ Real-time editing</li>
                <li>✅ Live cursors</li>
                <li>✅ Team chat</li>
                <li>✅ Version history</li>
                <li>✅ Conflict resolution</li>
              </ul>
            </div>
            
            <div className="start-actions">
              <button 
                onClick={startCollaboration}
                disabled={!currentProject || connectionStatus === 'connecting'}
                className="start-collaboration-btn"
              >
                {connectionStatus === 'connecting' ? 'Starting...' : 'Start Collaboration'}
              </button>
              
              {!currentProject && (
                <p className="requirement-text">Open a project to start collaborating</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="collaboration-active">
          {/* Session Info */}
          <div className="session-info">
            <div className="session-details">
              <strong>Session:</strong> {sessionId?.slice(-8)}
              <button onClick={shareProject} className="share-btn">📋 Share Link</button>
            </div>
            <button onClick={stopCollaboration} className="stop-btn">Stop Session</button>
          </div>

          {/* Collaboration Tabs */}
          <div className="collaboration-tabs">
            <button 
              className={`tab-btn ${showUsers ? 'active' : ''}`}
              onClick={() => { setShowUsers(!showUsers); setShowChat(false); setShowHistory(false); }}
            >
              👥 Users ({connectedUsers.length})
            </button>
            <button 
              className={`tab-btn ${showChat ? 'active' : ''}`}
              onClick={() => { setShowChat(!showChat); setShowUsers(false); setShowHistory(false); }}
            >
              💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
            </button>
            <button 
              className={`tab-btn ${showHistory ? 'active' : ''}`}
              onClick={() => { setShowHistory(!showHistory); setShowUsers(false); setShowChat(false); }}
            >
              📜 History
            </button>
          </div>

          {/* Users Panel */}
          {showUsers && (
            <div className="users-panel">
              {connectedUsers.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar" style={{ color: user.color }}>
                    {user.avatar}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-status">
                      {user.isActive ? (
                        <>
                          <span className="status-active">Active</span>
                          {user.selection && (
                            <span className="user-selection">Editing object</span>
                          )}
                        </>
                      ) : (
                        <span className="status-inactive">
                          Away ({Math.floor((Date.now() - user.lastSeen.getTime()) / 60000)}m ago)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="user-cursor-color" style={{ backgroundColor: user.color }} />
                </div>
              ))}
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div className="chat-panel">
              <div className="chat-messages">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`chat-message ${msg.type}`}>
                    {msg.type === 'system' ? (
                      <div className="system-message">
                        <span className="system-icon">ℹ️</span>
                        {msg.message}
                      </div>
                    ) : (
                      <div className="user-message">
                        <div className="message-header">
                          <span className="sender-name">{msg.userName}</span>
                          <span className="message-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div className="message-content">{msg.message}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              <div className="chat-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button onClick={sendChatMessage} className="send-btn">Send</button>
              </div>
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="history-panel">
              <div className="history-header">
                <h4>Version History</h4>
                <button onClick={exportHistory} className="export-history-btn">
                  📥 Export
                </button>
              </div>
              
              <div className="history-list">
                {versionHistory.reverse().map(version => (
                  <div key={version.id} className="history-item">
                    <div className="history-time">
                      {version.timestamp.toLocaleString()}
                    </div>
                    <div className="history-details">
                      <div className="history-action">{version.action}</div>
                      <div className="history-description">{version.description}</div>
                      <div className="history-user">by {version.userName}</div>
                    </div>
                    <button className="restore-btn">Restore</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaborationSystem;
