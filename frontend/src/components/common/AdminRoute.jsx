import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { ADMIN_WALLET } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { walletAddress } = useWallet();
  const toasted = useRef(false);
  const normalizedWalletAddress = typeof walletAddress === 'string'
    ? walletAddress
    : walletAddress?.publicKey || walletAddress?.address || walletAddress?.walletAddress || '';

  // Admin can be detected by role OR by the connected wallet address
  const isAdminByWallet = normalizedWalletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();
  const isAdmin = user?.role === 'admin' || isAdminByWallet;
  const denied = !loading && user && !isAdmin;

  useEffect(() => { if (denied && !toasted.current) { toasted.current = true; toast.error('Access denied'); } }, [denied]);
  if (loading) return <LoadingSpinner message="Checking access..." />;
  if (!user) return <Navigate to="/" replace />;
  if (denied) return <Navigate to="/" replace />;
  return children;
};

export default AdminRoute;
