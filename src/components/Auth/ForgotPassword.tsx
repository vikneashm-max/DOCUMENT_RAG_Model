import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
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
      const response = await fetch('http://localhost:8000/forgot-password', {
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-subtitle">We will help you recover access to your account</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: 1.5,
              marginBottom: '24px'
            }}>
              {success}
            </div>

            {testLink && (
              <div style={{
                background: '#f0fdfa',
                border: '1px dashed #0d9488',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  🧪 Local Testing Helper
                </span>
                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 10px' }}>
                  Since no mail server is connected, use this direct link to complete the reset:
                </p>
                <a href={testLink} style={{
                  fontSize: '13px',
                  color: '#0d9488',
                  fontWeight: 700,
                  wordBreak: 'break-all',
                  textDecoration: 'underline'
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
            {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: 500 }}>{error}</div>}
            
            <div className="auth-form-group">
              <label className="auth-form-label">Email address</label>
              <div className="auth-input-wrapper">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? 'Sending link...' : 'Send reset link'}
            </button>

            <p className="auth-footer" style={{ marginTop: '20px' }}>
              Remembered your password? <Link to="/" className="auth-link">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
