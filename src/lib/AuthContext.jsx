import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { appClient } from '@/api/appClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({
    id: 'freakfit',
    public_settings: { requires_auth: false },
  });

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await appClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to load user',
      });
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setAppPublicSettings({
      id: 'freakfit',
      public_settings: { requires_auth: false },
    });
    await checkUserAuth();
    setIsLoadingPublicSettings(false);
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    appClient.auth.logout('/Onboarding');
  };

  const navigateToLogin = () => {
    appClient.auth.redirectToLogin('/Onboarding');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth,
    }}>
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
