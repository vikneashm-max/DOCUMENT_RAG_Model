import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DocumentManager.css';

interface DocumentItem {
  id: number;
  file_name: string;
  file_type: string;
  status: 'pending' | 'processed' | 'error';
  created_at: string;
}

interface DocStats {
  total_documents: number;
  total_processed: number;
  storage_used: string;
}

const DocumentManager = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<DocStats>({ total_documents: 0, total_processed: 0, storage_used: '0 KB' });
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = 'https://document-rag-model.onrender.com';

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/documents?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/documents/stats?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDocuments(), fetchStats()]);
      setLoading(false);
    };
    
    loadData();
  }, [token]);

  // Show auto-dismiss toast notification
  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Upload file logic
  const handleFiles = (files: FileList) => {
    const file = files[0];
    const allowedExtensions = ['pdf', 'docx', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExtensions.includes(fileExtension)) {
      showNotification('Unsupported file type. Please upload PDF, DOCX, or TXT.', 'error');
      return;
    }

    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    // Pass token as query parameter
    xhr.open('POST', `${API_URL}/upload?token=${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentage);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        showNotification(`"${file.name}" uploaded and processed successfully!`, 'success');
        fetchDocuments();
        fetchStats();
      } else {
        showNotification('Failed to upload file. Please try again.', 'error');
        fetchDocuments(); // refresh in case it recorded an error status
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      showNotification('Network error during file upload.', 'error');
    };

    xhr.send(formData);
  };

  const handleDelete = async (docId: number, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/documents/${docId}?token=${token}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('Document deleted successfully.', 'success');
        setDocuments(documents.filter((doc) => doc.id !== docId));
        fetchStats();
      } else {
        showNotification('Failed to delete document.', 'error');
      }
    } catch (error) {
      showNotification('Error connecting to server.', 'error');
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="docs-page-wrapper">
        <div className="docs-container">
          <div className="typing">Loading documents workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="docs-page-wrapper">
      <div className="docs-container">
        
        {/* Toast Alert */}
        {notification && (
          <div className={`docs-toast-alert ${notification.type}`}>
            <div className="toast-icon">
              {notification.type === 'success' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
            </div>
            <span>{notification.text}</span>
          </div>
        )}

        {/* Header Top Bar */}
        <div className="docs-top-bar">
          <Link to="/chat" className="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Chat
          </Link>
          <span className="docs-page-title">Document Space</span>
        </div>

        {/* Stats Grid at top */}
        <div className="docs-stats-grid">
          <div className="doc-stat-card">
            <div className="stat-icon-wrapper blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <h3>{stats.total_documents}</h3>
              <p>Total Uploaded</p>
            </div>
          </div>

          <div className="doc-stat-card">
            <div className="stat-icon-wrapper green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <h3>{stats.total_processed}</h3>
              <p>Processed Successfully</p>
            </div>
          </div>

          <div className="doc-stat-card">
            <div className="stat-icon-wrapper purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
            <div className="stat-info">
              <h3>{stats.storage_used}</h3>
              <p>Storage Consumed</p>
            </div>
          </div>
        </div>

        <div className="docs-main-grid">
          {/* Upload Section */}
          <div className="docs-upload-card">
            <h4>Upload Knowledge Base</h4>
            <p className="card-subtitle">Add context documents to train DocuRAG in real time.</p>
            
            <form 
              className={`drag-drop-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={!uploading ? onButtonClick : undefined}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInput}
                accept=".pdf,.docx,.txt"
              />

              <div className="upload-prompt">
                <div className="cloud-icon-box">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.5-2-2.4-3.5-4.5-3.5h-1.1c-.8-3-3.7-5-6.8-4.5-2.7.4-4.8 2.5-5.2 5.2-.6.7-1.1 1.5-1.4 2.4-1.2 3.1 1 6.5 4.3 6.8h11.5c1.1-.1 2-.8 2.5-1.8z"></path>
                    <polyline points="16 16 12 12 8 16"></polyline>
                    <line x1="12" y1="12" x2="12" y2="21"></line>
                  </svg>
                </div>
                <h5>Drag & Drop Document</h5>
                <p>or click here to browse your storage</p>
                <span className="file-formats">Supported formats: PDF, DOCX, TXT</span>
              </div>
            </form>

            {/* Upload Progress */}
            {uploading && (
              <div className="upload-progress-wrapper">
                <div className="progress-info">
                  <span>Uploading and digesting context...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Documents Table List */}
          <div className="docs-list-card">
            <div className="docs-list-header">
              <h4>Uploaded Files</h4>
              <span className="count-badge">{documents.length} Files</span>
            </div>

            {documents.length === 0 ? (
              <div className="empty-docs-state">
                <div className="empty-icon-box">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <h5>Workspace is Empty</h5>
                <p>Upload a document on the left to initialize the DocuRAG context pool.</p>
              </div>
            ) : (
              <div className="table-responsive-docs">
                <table className="docs-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Type</th>
                      <th>Upload Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td className="doc-name-cell" title={doc.file_name}>
                          {doc.file_name}
                        </td>
                        <td>
                          <span className={`file-type-pill ${doc.file_type.toLowerCase()}`}>
                            {doc.file_type}
                          </span>
                        </td>
                        <td className="date-cell">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td>
                          <span className={`status-pill ${doc.status}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="doc-delete-btn"
                            onClick={() => handleDelete(doc.id, doc.file_name)}
                            title="Delete file"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentManager;
