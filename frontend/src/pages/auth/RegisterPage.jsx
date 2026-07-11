import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiLock, FiArrowRight } from 'react-icons/fi';
import BackgroundOrbs from '../../components/ui/BackgroundOrbs';

const schema = yup.object({
  name: yup.string().required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string(),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm your password'),
});

const RegisterPage = () => {
  const { register: authRegister, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
      const { confirmPassword, ...rest } = data;
      await authRegister({ ...rest, role: 'business_owner' });
      toast.success('Account created! Please complete your KYC to raise funds.');
      navigate('/kyc');
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
          <h2 className="text-2xl font-bold text-white mb-1">Create Business Account</h2>
          <p className="text-sm text-gray-500">
            For fund raisers only.{' '}
            <Link to="/" className="text-primary-400 hover:text-primary-300 transition-colors">
              Investors — just connect your wallet
            </Link>
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 border border-white/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Full Name" error={errors.name?.message} icon={<FiUser size={14} />}>
              <input {...register('name')} className="input-dark pl-10" placeholder="John Doe" />
            </FormField>

            <FormField label="Email" error={errors.email?.message} icon={<FiMail size={14} />}>
              <input type="email" {...register('email')} className="input-dark pl-10" placeholder="you@example.com" />
            </FormField>

            <FormField label="Phone (optional)" icon={<FiPhone size={14} />}>
              <input type="tel" {...register('phone')} className="input-dark pl-10" placeholder="+91 98765 43210" />
            </FormField>

            <FormField label="Password" error={errors.password?.message} icon={<FiLock size={14} />}>
              <input type="password" {...register('password')} className="input-dark pl-10" placeholder="Min 8 characters" />
            </FormField>

            <FormField label="Confirm Password" error={errors.confirmPassword?.message} icon={<FiLock size={14} />}>
              <input type="password" {...register('confirmPassword')} className="input-dark pl-10" placeholder="Repeat password" />
            </FormField>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>Create Business Account</span>
                  <FiArrowRight size={14} />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, children, error, icon }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {icon}
        </span>
      )}
      {children}
    </div>
    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
  </div>
);

export default RegisterPage;


