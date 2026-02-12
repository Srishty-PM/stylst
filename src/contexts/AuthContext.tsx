import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@/lib/mock-data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('stylst_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading] = useState(false);

  const persist = (u: User | null) => {
    if (u) localStorage.setItem('stylst_user', JSON.stringify(u));
    else localStorage.removeItem('stylst_user');
    setUser(u);
  };

  const login = useCallback(async (email: string, _password: string) => {
    const u: User = {
      id: crypto.randomUUID(),
      email,
      full_name: email.split('@')[0],
      subscription_tier: 'free',
      onboarding_completed: true,
      pinterest_connected: false,
    };
    persist(u);
  }, []);

  const signup = useCallback(async (email: string, _password: string, fullName: string) => {
    const u: User = {
      id: crypto.randomUUID(),
      email,
      full_name: fullName,
      subscription_tier: 'free',
      onboarding_completed: false,
      pinterest_connected: false,
    };
    persist(u);
  }, []);

  const logout = useCallback(() => persist(null), []);

  const completeOnboarding = useCallback(() => {
    if (user) persist({ ...user, onboarding_completed: true });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};
