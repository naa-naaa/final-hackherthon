import { MessageSquare, Users } from 'lucide-react';
import { getLastMessage, getGroups } from '../../lib/store';
import { Message, Group, ChatTarget } from '../../lib/types';
import './ChatSidebar.css';

interface ChatSidebarProps {
  currentUser: string;
  users: string[];
  activeChat: ChatTarget | null;
  onSelectChat: (target: ChatTarget) => void;
  messages: Message[];
}

export default function ChatSidebar({
  currentUser,
  users,
  activeChat,
  onSelectChat,
  messages,
}: ChatSidebarProps) {
  const groups = getGroups(currentUser);

  return (
    <aside className="chat-sidebar">
      <div className="sidebar-header">
        <h3>Conversations</h3>
      </div>
      <div className="sidebar-list">
        {/* Groups */}
        {groups.length > 0 && (
          <>
            <div className="sidebar-section-label">Groups</div>
            {groups.map(group => {
              const isActive = activeChat?.type === 'group' && activeChat.id === group.id;
              return (
                <button
                  key={group.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat({ type: 'group', id: group.id, name: group.name })}
                >
                  <div className="sidebar-avatar sidebar-avatar-group" style={{ background: group.avatar_color }}>
                    <Users size={18} />
                  </div>
                  <div className="sidebar-info">
                    <div className="sidebar-name">{group.name}</div>
                    <div className="sidebar-preview">
                      <span className="preview-text text-muted">{group.members.length} members</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Direct Messages */}
        <div className="sidebar-section-label">Direct Messages</div>
        {users.map(user => {
          const lastMsg = getLastMessage(currentUser, user);
          const isActive = activeChat?.type === 'user' && activeChat.id === user;
          
          return (
            <button
              key={user}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectChat({ type: 'user', id: user, name: user })}
            >
              <div className="sidebar-avatar">
                {user.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-info">
                <div className="sidebar-name">{user}</div>
                <div className="sidebar-preview">
                  {lastMsg ? (
                    <>
                      <span className="preview-text">
                        {lastMsg.sender === currentUser ? 'You: ' : ''}
                        {lastMsg.content.length > 30
                          ? lastMsg.content.slice(0, 30) + '…'
                          : lastMsg.content}
                      </span>
                    </>
                  ) : (
                    <span className="preview-text text-muted">No messages yet</span>
                  )}
                </div>
              </div>
              {lastMsg && (
                <span className="sidebar-time">
                  {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
