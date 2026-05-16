import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentConversationId: number | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setConversationId: (id: number | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_data');
    const storedConvId = localStorage.getItem('conversation_id');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      if (storedConvId) setCurrentConversationId(Number(storedConvId));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
  };

  const setConversationId = (id: number | null) => {
    setCurrentConversationId(id);
    if (id) {
      localStorage.setItem('conversation_id', id.toString());
    } else {
      localStorage.removeItem('conversation_id');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCurrentConversationId(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('conversation_id');
    window.location.href = '/';
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, currentConversationId, login, logout, setConversationId, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
