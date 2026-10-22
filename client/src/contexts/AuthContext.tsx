import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  switchRole: (role: UserRole) => Promise<boolean>;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  registerCustomer: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const GUEST_CUSTOMER: User = {
  id: '',
  name: 'Campus Guest',
  email: '',
  role: 'customer',
  phone: '',
};

// Seeded credentials for rapid testing via PrototypeBanner
export const SEEDED_CREDENTIALS = {
  customer: {
    email: 'student@college.edu',
    password: 'StudentSecurePass2026!',
  },
  cashier: {
    email: 'cashier@foodcourt.internal',
    password: 'CashierSecurePass2026!',
  },
  manager: {
    email: 'manager@foodcourt.internal',
    password: 'ManagerSecurePass2026!',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_CUSTOMER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Restore session from backend on mount
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authApi.getMe();
      if (res?.user) {
        setCurrentUser({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
        });
        setIsAuthenticated(true);
      } else {
        setCurrentUser(GUEST_CUSTOMER);
        setIsAuthenticated(false);
      }
    } catch {
      // 401 Unauthorized or no active cookie
      setCurrentUser(GUEST_CUSTOMER);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login with credentials against backend
  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Determine password (custom or matching seeded account)
      let resolvedPassword = password;
      if (!resolvedPassword) {
        const lower = email.toLowerCase().trim();
        if (lower === SEEDED_CREDENTIALS.cashier.email) resolvedPassword = SEEDED_CREDENTIALS.cashier.password;
        else if (lower === SEEDED_CREDENTIALS.manager.email) resolvedPassword = SEEDED_CREDENTIALS.manager.password;
        else if (lower === SEEDED_CREDENTIALS.customer.email) resolvedPassword = SEEDED_CREDENTIALS.customer.password;
        else resolvedPassword = 'password123';
      }

      const res = await authApi.login({ email: email.trim(), password: resolvedPassword });
      setCurrentUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
      });
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register new customer account against backend
  const registerCustomer = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone?.trim() || undefined,
      });

      setCurrentUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: 'customer',
      });
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check details and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout from backend session
  const logout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch {
      // Continue cleanup on client
    } finally {
      setCurrentUser(GUEST_CUSTOMER);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  // Rapid role switching for reviewer testing
  const switchRole = async (targetRole: UserRole): Promise<boolean> => {
    const creds = SEEDED_CREDENTIALS[targetRole];
    if (creds) {
      return login(creds.email, creds.password);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        error,
        switchRole,
        login,
        logout,
        registerCustomer,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
