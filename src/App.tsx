import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import './index.css';

const DocuRAG = () => {
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'all' | 'image'>('all');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content?: string, file?: { name: string, type: string } }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const API_URL = 'http://localhost:8000';

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
    if (!inputValue.trim() && !selectedFile) return;

    setIsLoading(true);

    // 1. Handle File Upload if exists
    if (selectedFile) {
      const file = selectedFile;
      const fileType = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      
      // Add file card to chat history
      setMessages(prev => [...prev, { role: 'user', file: { name: file.name, type: fileType } }]);
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData,
        });
        await response.json();
        setNotification('File is successfully uploaded and chunked');
      } catch (error) {
        console.error('Upload failed:', error);
        setNotification('Failed to upload and process the file.');
      }
      
      setSelectedFile(null);
    }

    // 2. Handle Text Message if exists
    if (inputValue.trim()) {
      const userMessage = inputValue;
      setInputValue('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage }),
        });

        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } catch (error) {
        console.error('Chat failed:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please make sure the backend is running.' }]);
      }
    }

    setIsLoading(false);
  };

  const recentChats = ['New chat'];

  return (
    <div id="root">
      {notification && (
        <div className="notification-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {notification}
        </div>
      )}
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="new-chat-btn" onClick={() => setMessages([])}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New chat
        </button>

        <div className="sidebar-section">
          <div className="section-title">Recent</div>
          {recentChats.map((chat, i) => (
            <div key={i} className="chat-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {chat}
            </div>
          ))}
        </div>

        <footer className="sidebar-footer">
          <div className="user-profile" onClick={() => navigate('/login')}>
            <div className="user-info">
              <div className="avatar">V</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="email">vikneashm@gmail.com</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Sign out</span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <svg className="header-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span>DocuRAG</span>
          </div>
        </header>

        <div className="chat-container">
          {messages.length === 0 ? (
            <section className="welcome-section">
              <div className="logo-container">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h1 className="welcome-title">How can I help you today?</h1>
            </section>
          ) : (
            <div className="messages-list">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'assistant' ? 'AI' : ''}
                  </div>
                  <div className="message-content">
                    {msg.file ? (
                      <div className="file-preview-card chat-card">
                        <div className="file-card-content">
                          <div className="file-icon-box">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message-row assistant">
                  <div className="message-avatar">AI</div>
                  <div className="message-content typing">DocuRAG is thinking...</div>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <div className="attachment-container">
              <button 
                className="attachment-btn" 
                onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              
              {isUploadMenuOpen && (
                <div className="upload-popup">
                  <button className="upload-option" onClick={() => triggerUpload('all')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Upload Document
                  </button>
                  <button className="upload-option" onClick={() => triggerUpload('image')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    Upload Image
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              className="chat-input"
              placeholder="Message DocuRAG..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
              onClick={handleSendMessage}
              disabled={isLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          <div className="disclaimer">
            DocuRAG can make mistakes. Check important info.
          </div>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DocuRAG />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  );
};

export default App;
