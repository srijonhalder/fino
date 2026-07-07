import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser as loginAPI, registerUser as registerAPI, getCurrentUser, walletConnectApi, walletSignupApi } from '../services/auth.api';

export const ADMIN_WALLET = (
  process.env.REACT_APP_ADMIN_WALLET ||
  'GBFONIF2XYE7HCJ5RUSRQRZCCCYGMPKM3XDMUKIQJJPZOAHUGJNDOZDG'
).trim();

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fino_token'));
  const [loading, setLoading] = useState(true);
  const [pendingWallet, setPendingWallet] = useState(null); // Wallet awaiting signup

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuth = async () => {
      const savedToken = localStorage.getItem('fino_token');
      if (savedToken) {
        try {
          const res = await getCurrentUser();
          setUser(res.data.data.user);
          setToken(savedToken);
        } catch {
          localStorage.removeItem('fino_token');
          localStorage.removeItem('fino_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    restoreAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginAPI(email, password);
    const { token: jwt, user: userData } = res.data.data;
    localStorage.setItem('fino_token', jwt);
    localStorage.setItem('fino_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await registerAPI(formData);
    const { token: jwt, user: userData } = res.data.data;
    localStorage.setItem('fino_token', jwt);
    localStorage.setItem('fino_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  /**
   * Connect wallet - returns { user, isAdmin } for existing users
   * or { isNewUser: true, walletAddress } for new wallets requiring signup
   */
  const walletLogin = useCallback(async (walletAddress) => {
    const res = await walletConnectApi(walletAddress);
    const data = res.data.data;
    
    // Check if this is a new user requiring signup
    if (data.isNewUser || data.requiresSignup) {
      setPendingWallet(data.walletAddress);
      return { isNewUser: true, walletAddress: data.walletAddress };
    }
    
    // Existing user - complete login
    const { token: jwt, user: userData, isAdmin } = data;
    localStorage.setItem('fino_token', jwt);
    localStorage.setItem('fino_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    return { user: userData, isAdmin };
  }, []);

  /**
   * Complete wallet signup for new users
   */
  const walletSignup = useCallback(async (walletAddress, name, email) => {
    const res = await walletSignupApi(walletAddress, name, email);
    const { token: jwt, user: userData } = res.data.data;
    localStorage.setItem('fino_token', jwt);
    localStorage.setItem('fino_user', JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
    setPendingWallet(null);
    return userData;
  }, []);

  /**
   * Cancel pending wallet signup
   */
  const cancelWalletSignup = useCallback(() => {
    setPendingWallet(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fino_token');
    localStorage.removeItem('fino_user');
    setToken(null);
    setUser(null);
    setPendingWallet(null);
  }, []);

  const updateUser = useCallback((newData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('fino_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      pendingWallet,
      login, 
      register, 
      walletLogin, 
      walletSignup,
      cancelWalletSignup,
      logout, 
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
