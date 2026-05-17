import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testLink, setTestLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setTestLink('');

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to request password reset');
      }

      setSuccess(data.message);
      
      // If a development test link is returned, save it
      if (data.link) {
        setTestLink(data.link);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#forgot-logo-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="forgot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-subtitle">We will help you recover access to your DocuRAG workspace</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', animation: 'authFadeIn 0.4s ease' }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.5,
              marginBottom: '24px'
            }}>
              {success}
            </div>

            {testLink && (
              <div style={{
                background: '#faf5ff',
                border: '1px dashed #d8b4fe',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  🧪 Local Testing Helper
                </span>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.4 }}>
                  Since no mail server is configured locally, use this direct link to reset your password:
                </p>
                <a href={testLink} className="auth-link" style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  wordBreak: 'break-all'
                }}>
                  Click to Reset Password
                </a>
              </div>
            )}

            <p className="auth-footer" style={{ marginTop: '0' }}>
              Remembered your password? <Link to="/" className="auth-link">Sign in</Link>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '4px', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
            
            <div className="auth-form-group">
              <label className="auth-form-label">Email address</label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                  <span>Sending link...</span>
                </>
              ) : 'Send reset link'}
            </button>

            <p className="auth-footer" style={{ marginTop: '12px' }}>
              Remembered your password? <Link to="/" className="auth-link">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
