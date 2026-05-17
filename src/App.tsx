import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import ReactMarkdown from 'react-markdown';
import Profile from './components/Profile/Profile';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeText = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return !inline ? (
    <div className="code-block-wrapper" style={{ margin: '16px 0', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="code-block-header">
        <span>{match ? match[1] : 'code'}</span>
        <button className="copy-code-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre {...props} style={{ margin: 0, border: 'none', borderRadius: 0 }}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  ) : (
    <code className={className} {...props}>{children}</code>
  );
};

const AssistantMessage = ({ content, onRegenerate }: { content: string, onRegenerate: () => void }) => {
  const [feedback, setFeedback] = useState<'none' | 'like' | 'dislike'>('none');

  return (
    <div className="message-row assistant">
      <div className="message-header-row">
        <div className="message-avatar-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <path d="M12 2v2"></path>
            <path d="M12 8v3"></path>
            <path d="M8 15h.01"></path>
            <path d="M16 15h.01"></path>
          </svg>
        </div>
        <span className="message-sender-name">AI Assistant</span>
      </div>
      <div className="message-content">
        <div className="markdown-content">
          <ReactMarkdown components={{ code: CodeBlock }}>{content || ''}</ReactMarkdown>
        </div>
      </div>
      <div className="feedback-bar">
        <button 
          className={`feedback-btn thumbs-up ${feedback === 'like' ? 'active' : ''}`}
          onClick={() => setFeedback(feedback === 'like' ? 'none' : 'like')}
          title="Good response"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        </button>
        <button 
          className={`feedback-btn thumbs-down ${feedback === 'dislike' ? 'active' : ''}`}
          onClick={() => setFeedback(feedback === 'dislike' ? 'none' : 'dislike')}
          title="Bad response"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
          </svg>
        </button>
        <button className="regenerate-btn" onClick={onRegenerate} title="Regenerate response">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Regenerate
        </button>
      </div>
    </div>
  );
};

const DocuRAG = () => {
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const [uploadType, setUploadType] = useState<'all' | 'image'>('all');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content?: string, file?: { name: string, type: string } }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{id: number, title: string, created_at: string}[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  const { token, user, logout, currentConversationId, setConversationId } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/conversations?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversation = async (id: number) => {
    if (!token) return;
    setIsLoading(true);
    setConversationId(id);
    try {
      const response = await fetch(`${API_URL}/conversations/${id}/messages?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/conversations/${id}?token=${token}`, { method: 'DELETE' });
      if (response.ok) {
        if (currentConversationId === id) {
          setConversationId(null);
          setMessages([]);
        }
        fetchConversations();
        setNotification('Conversation deleted.');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  React.useEffect(() => {
    fetchConversations();
  }, [token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Close upload menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };

    if (isUploadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  // Close profile menu on click outside
  React.useEffect(() => {
    const handleClickOutsideProfile = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfilePopupOpen(false);
      }
    };

    if (isProfilePopupOpen) {
      document.addEventListener('mousedown', handleClickOutsideProfile);
    } else {
      document.removeEventListener('mousedown', handleClickOutsideProfile);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideProfile);
    };
  }, [isProfilePopupOpen]);

  const handleRegenerate = async (index: number) => {
    let lastUserQuery = '';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content) {
        lastUserQuery = messages[i].content || '';
        break;
      }
    }
    
    if (!lastUserQuery) return;
    
    setIsLoading(true);
    const messagesToKeep = messages.slice(0, index);
    setMessages(messagesToKeep);

    try {
      const authHeaders = {
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 
          ...authHeaders,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          message: lastUserQuery,
          model: "llama-3.3-70b-versatile",
          conversation_id: currentConversationId,
          token: token
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setIsUploadMenuOpen(false);
    }
  };

  const triggerUpload = (type: 'all' | 'image') => {
    setUploadType(type);
    setIsUploadMenuOpen(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleSendMessage = async () => {
    const textToSend = inputValue.trim();
    const fileToSend = selectedFile;
    
    if (!textToSend && !fileToSend) return;

    // 1. Immediately update UI to feel responsive
    setInputValue('');
    setSelectedFile(null);
    setIsLoading(true);

    // 2. Add messages to chat history immediately
    const newMessages = [...messages];
    if (fileToSend) {
      const fileType = fileToSend.name.split('.').pop()?.toUpperCase() || 'FILE';
      newMessages.push({ role: 'user', file: { name: fileToSend.name, type: fileType } });
    }
    if (textToSend) {
      newMessages.push({ role: 'user', content: textToSend });
    }
    setMessages(newMessages);

    try {
      const authHeaders = {
        'Authorization': `Bearer ${token}`
      };

      // 3. Perform Upload if needed
      if (fileToSend) {
        const formData = new FormData();
        formData.append('file', fileToSend);
        
        try {
          await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: authHeaders,
            body: formData,
          });
        } catch (error) {
          console.error('Upload failed:', error);
          setNotification('Failed to process the document.');
        }
      }

      // 4. Perform Chat if needed
      if (textToSend) {
        try {
          const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 
              ...authHeaders,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
              message: textToSend,
              model: "llama-3.3-70b-versatile",
              conversation_id: currentConversationId,
              token: token
            }),
          });

          if (response.status === 401) {
             logout();
             return;
          }

          const data = await response.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
          if (data.conversation_id && data.conversation_id !== currentConversationId) {
            setConversationId(data.conversation_id);
            fetchConversations();
          }
        } catch (error) {
          console.error('Chat failed:', error);
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please make sure the backend is running.' }]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div id="root">
      {notification && (
        <div className="notification-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {notification}
        </div>
      )}
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-wrapper">
            <span className="sidebar-brand">DocuRAG</span>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)} title="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={() => {
          setMessages([]);
          setConversationId(null);
          setIsSidebarOpen(false);
          setNotification('Started a new conversation.');
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New chat
        </button>

        <div className="sidebar-section">

          <div className="section-title">Recent Chats</div>
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              className={`chat-item ${currentConversationId === conv.id ? 'active' : ''}`}
              onClick={() => loadConversation(conv.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="chat-title">{conv.title}</span>
              <button 
                className="delete-conv-btn"
                onClick={(e) => deleteConversation(e, conv.id)}
                title="Delete chat thread"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="empty-history">No past conversations</div>
          )}
        </div>

        {/* Clean dropup Profile footer */}
        <footer className="sidebar-footer" ref={profileMenuRef}>
          {isProfilePopupOpen && (
            <div className="profile-popover">
              <button className="profile-popover-item" onClick={() => { setIsProfilePopupOpen(false); navigate('/profile'); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                View Profile
              </button>
              <button className="profile-popover-item logout" onClick={() => { setIsProfilePopupOpen(false); logout(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign out
              </button>
            </div>
          )}
          <button className="sidebar-profile-card" onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}>
            <div className="sidebar-avatar">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user?.full_name || 'User'}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg className="header-logo" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#header-logo-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="header-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="header-brand">Workspace</span>
            </div>
          </div>
        </header>

        <div className="chat-container">
          {messages.length === 0 ? (
            <section className="welcome-section">
              <h1 className="welcome-title">How can I assist you today?</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '500px', margin: '12px auto 0', lineHeight: '1.6', textAlign: 'center' }}>
                Upload documents in the sidebar or directly in the chat to get instant, vector-backed insights.
              </p>
            </section>
          ) : (
            <div className="messages-list">
              {messages.map((msg, i) => (
                msg.role === 'assistant' ? (
                  <AssistantMessage 
                    key={i} 
                    content={msg.content || ''} 
                    onRegenerate={() => handleRegenerate(i)}
                  />
                ) : (
                  <div key={i} className="message-row user">
                    <div className={`message-content ${msg.file ? 'file-msg' : ''}`}>
                      {msg.file ? (
                        <div className="file-preview-card chat-card">
                          <div className="file-card-content">
                            <div className="file-icon-box">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                              </svg>
                            </div>
                            <div className="file-card-info">
                              <div className="file-card-name">{msg.file.name}</div>
                              <div className="file-card-type">{msg.file.type}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        msg.content || ''
                      )}
                    </div>
                  </div>
                )
              ))}
              {isLoading && (
                <div className="message-row assistant">
                  <div className="message-header-row">
                    <div className="message-avatar-box">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                    </div>
                    <span className="message-sender-name">AI Assistant</span>
                  </div>
                  <div className="message-content typing" style={{ paddingLeft: '34px' }}>DocuRAG is searching vector context</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-area">
          {selectedFile && (
            <div className="file-preview-card">
              <div className="file-card-content">
                <div className="file-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div className="file-card-info">
                  <div className="file-card-name">{selectedFile.name}</div>
                  <div className="file-card-type">{selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                </div>
              </div>
              <button className="file-card-remove" onClick={() => setSelectedFile(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}
          
          <div className="input-wrapper">
            <input
              type="file"
              id="file-upload"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept={uploadType === 'image' ? "image/*" : ".pdf,.doc,.docx,.txt"}
            />
            
            <textarea
              className="chat-input"
              placeholder="Ask DocuRAG..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              style={{ minHeight: '24px', overflowY: 'hidden' }}
            />

            <div className="input-tools-row">
              <div className="input-tools-left">
                <div className="attachment-container" ref={menuRef}>
                  <button 
                    className="attachment-btn" 
                    onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                    title="Attach document or image"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                  
                  {isUploadMenuOpen && (
                    <div className="upload-popup">
                      <button className="upload-option" onClick={() => triggerUpload('all')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Upload Document
                      </button>
                      <button className="upload-option" onClick={() => triggerUpload('image')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        Upload Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="input-tools-right">
                <span className="char-counter">{inputValue.length} chars</span>
                <button 
                  className={`send-btn ${(inputValue.trim() || selectedFile) ? 'active' : ''}`}
                  onClick={handleSendMessage}
                  disabled={isLoading || (!inputValue.trim() && !selectedFile)}
                  title="Send context query"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="disclaimer">
            DocuRAG can make mistakes. Verify important context.
          </div>
        </div>
      </main>
    </div>
  );
};


const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <DocuRAG />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
