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
      <div className="profile-container">
        <div className="typing">Loading profile data...</div>
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
    <div className="profile-container">
      <Link to="/chat" className="back-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Chat
      </Link>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">{initials}</div>
          <div className="profile-info-header">
            <h2>{profile?.full_name}</h2>
            <p>{profile?.email}</p>
          </div>
          <button 
            onClick={logout}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign out
          </button>
        </div>

        <div className="profile-content">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{profile?.total_conversations}</span>
              <span className="stat-label">Conversations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile?.total_messages}</span>
              <span className="stat-label">Messages Sent</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ fontSize: '14px' }}>{joinDate}</span>
              <span className="stat-label">Joined On</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>Account Settings</h3>
            <div className="password-form">
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {passwordMessage.text && (
                  <div style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '16px', 
                    fontSize: '14px',
                    backgroundColor: passwordMessage.type === 'error' ? '#fee2e2' : '#d1fae5',
                    color: passwordMessage.type === 'error' ? '#b91c1c' : '#065f46',
                    border: `1px solid ${passwordMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`
                  }}>
                    {passwordMessage.text}
                  </div>
                )}

                <button type="submit" className="submit-btn" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
