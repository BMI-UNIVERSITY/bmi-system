import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bmi_admin_token'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const s = localStorage.getItem('bmi_admin_user');
    return s ? JSON.parse(s) : null;
  });

  const login = (newToken: string, newUser: AdminUser) => {
    localStorage.setItem('bmi_admin_token', newToken);
    localStorage.setItem('bmi_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('bmi_admin_token');
    localStorage.removeItem('bmi_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
