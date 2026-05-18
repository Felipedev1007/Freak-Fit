import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { appClient } from '@/api/appClient';

const AuthContext = createContext(null);

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
      setUser(null);
      setIsAuthenticated(false);
      if (error.type === 'auth_required') {
        setAuthError(null);
      } else {
        console.error('Falha ao verificar autenticação:', error);
        setAuthError({
          type: 'unknown',
          message: error.message || 'Não foi possível carregar o usuário',
        });
      }
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

  const logout = (redirectUrl = '/') => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    appClient.auth.logout(redirectUrl);
  };

  const navigateToLogin = () => {
    appClient.auth.redirectToLogin('/Painel');
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
