import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiEye, FiEyeOff, FiMail, FiLock, FiZap } from 'react-icons/fi';
import BackgroundOrbs from '../../components/ui/BackgroundOrbs';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'business_owner' ? '/dashboard/business' : '/dashboard/investor');
    }
  }, [user, navigate]);

  if (user) return null;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const u = await login(data.email, data.password);
      toast.success('Welcome back!');
      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'business_owner') navigate('/dashboard/business');
      else navigate('/dashboard/investor');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-12 px-4 relative overflow-hidden pt-24">
      <BackgroundOrbs variant="subtle" />
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22D3A5, #22D3EE)', boxShadow: '0 0 24px rgba(34,211,165,0.5)' }}
          >
            <span className="text-white font-bold">IX</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Business Owner Login</h2>
          <p className="text-sm text-gray-500">
            This login is for fund raisers only.{' '}
            <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">
              Investors — just connect your wallet
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  {...register('email')}
                  className="input-dark pl-10"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  className="input-dark pl-10 pr-10"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <FiZap size={15} />
                  <span>Sign In</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-sm text-gray-500">
              Need a business account?{' '}
              <Link to="/raise-funds" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Raise Funds
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


