import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import LoadingSpinner from './LoadingSpinner';

/**
 * Route guard: requires wallet to be connected (and thus user to be authenticated via wallet-connect).
 * No KYC needed. Just wallet.
 */
const WalletRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { isConnected } = useWallet();

  if (loading) return <LoadingSpinner message="Checking connection..." />;
  if (!isConnected || !user) return <Navigate to="/" replace />;
  return children;
};

export default WalletRoute;
