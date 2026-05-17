import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

interface ProfileData {
  full_name: string;
  email: string;
  created_at: string;
  total_conversations: number;
  total_messages: number;
}

const Profile = () => {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });


  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/profile?token=${token}`);
        if (!response.ok) throw new Error('Failed to load profile');
        const data = await response.json();
        setProfile(data);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProfile();
  }, [token]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          current_password: currentPassword,
          new_password: newPassword
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update password');

      setPasswordMessage({ text: 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ text: err.message, type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-container">
          <div className="typing">Loading profile data...</div>
        </div>
      </div>
    );
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase() || 'U';
  const joinDate = profile ? new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        <div className="profile-top-bar">
          <Link to="/chat" className="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Chat
          </Link>
          <span className="profile-page-title">Account Dashboard</span>
        </div>

        <div className="dashboard-grid">
          {/* Left Column: Profile Card */}
          <div className="dashboard-sidebar-card">
            <div className="profile-header-premium">
              <div className="profile-avatar-premium">{initials}</div>
              <div className="profile-info-premium">
                <h2>{profile?.full_name}</h2>
                <p className="profile-email-premium">{profile?.email}</p>
                <div className="profile-badge-premium">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Verified User
                </div>
              </div>
            </div>

            <div className="profile-stats-premium">
              <div className="stat-panel-premium">
                <div className="stat-icon-premium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div className="stat-content-premium">
                  <span className="stat-value-premium">{profile?.total_conversations}</span>
                  <span className="stat-label-premium">Active Threads</span>
                </div>
              </div>

              <div className="stat-panel-premium">
                <div className="stat-icon-premium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </div>
                <div className="stat-content-premium">
                  <span className="stat-value-premium">{profile?.total_messages}</span>
                  <span className="stat-label-premium">Messages Transferred</span>
                </div>
              </div>

              <div className="stat-panel-premium">
                <div className="stat-icon-premium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div className="stat-content-premium">
                  <span className="stat-value-premium" style={{ fontSize: '13px' }}>{joinDate}</span>
                  <span className="stat-label-premium">Account Created</span>
                </div>
              </div>
            </div>

            <button onClick={logout} className="logout-btn-premium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign out from account
            </button>
          </div>

          {/* Right Column: Settings Form */}
          <div className="dashboard-main-card">
            <div className="card-header-premium">
              <h3>Security & Settings</h3>
              <p>Change your password below to update and secure your account credentials.</p>
            </div>
            
            <form onSubmit={handlePasswordChange} className="password-form-premium">
              <div className="form-group-premium">
                <label className="form-label-premium">Current Password</label>
                <div className="form-input-wrapper-premium">
                  <svg className="input-icon-premium" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    className="form-input-premium"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">New Password</label>
                <div className="form-input-wrapper-premium">
                  <svg className="input-icon-premium" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    className="form-input-premium"
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">Confirm New Password</label>
                <div className="form-input-wrapper-premium">
                  <svg className="input-icon-premium" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    className="form-input-premium"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {passwordMessage.text && (
                <div className={`form-alert-premium ${passwordMessage.type}`}>
                  <div className="alert-icon-premium">
                    {passwordMessage.type === 'error' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    )}
                  </div>
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <button type="submit" className="submit-btn-premium" disabled={passwordLoading}>
                {passwordLoading ? 'Updating credentials...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
