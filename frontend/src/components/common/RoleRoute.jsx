import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const RoleRoute = ({ roles = [], children }) => {
  const { user, loading } = useAuth();
  const toasted = useRef(false);
  const denied = !loading && user && !roles.includes(user.role);
  useEffect(() => { if (denied && !toasted.current) { toasted.current = true; toast.error('Access denied'); } }, [denied]);
  if (loading) return <LoadingSpinner message="Checking access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (denied) return <Navigate to="/" replace />;
  return children;
};

export default RoleRoute;
