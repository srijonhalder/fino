import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { toast } from 'react-toastify';
import { FiArrowRight, FiCheckCircle, FiShield, FiUser, FiMail, FiLock, FiPhone, FiZap } from 'react-icons/fi';

const registerSchema = yup.object({
  name: yup.string().required('Full name is required').min(2),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required').min(8, 'Minimum 8 characters').matches(/\d/, 'Must contain a number'),
  phone: yup.string().optional().matches(/^[6-9]\d{9}$/, { message: 'Valid 10-digit phone', excludeEmptyString: true }),
});

const STEPS = [
  { n: 1, label: 'Learn', icon: FiZap },
  { n: 2, label: 'Register', icon: FiUser },
  { n: 3, label: 'KYC', icon: FiShield },
  { n: 4, label: 'Apply', icon: FiCheckCircle },
];

const RaiseFundsPage = () => {
  const { user, register: registerUser } = useAuth();
  const { walletAddress, isConnected } = useWallet();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(registerSchema) });

  useEffect(() => {
    if (user?.role === 'business_owner' && !user?.isWalletUser) {
      if (user?.kycStatus === 'verified') navigate('/apply-funding');
      else setStep(3);
    }
  }, [user, navigate]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, role: 'business_owner' };
      if (isConnected && walletAddress) payload.walletAddress = walletAddress;
      await registerUser(payload);
      toast.success('Account created! Now complete your KYC.');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  const inpCls = "input-dark";

  return (
    <div className="min-h-screen bg-dark-900 py-20 px-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-32 left-1/4" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute bottom-0 right-0" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-3">Raise Funds for Your Business</h1>
          <p className="text-gray-400">Get your local business funded by community investors — powered by Stellar blockchain.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-col items-center">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s.n
                    ? 'text-white shadow-lg' : 'bg-white/10 text-gray-500'
                }`} style={step >= s.n ? { background: "linear-gradient(135deg,#22D3A5,#22D3EE)" } : {}}>
                  {s.n}
                </div>
                <span className={`text-xs mt-1.5 ${step >= s.n ? 'text-primary-400' : 'text-gray-600'}`}>{s.label}</span>
              </div>
              {i < 3 && (
                <div className={`w-12 h-0.5 mb-5 mx-1 transition-all ${step > s.n ? 'bg-gradient-to-r from-primary-500 to-cyan-500' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Info */}
        {step === 1 && (
          <div className="glass-strong rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">How Fund Raising Works</h2>
            <div className="space-y-4 mb-8">
              {[
                { icon: FiUser, color: "text-primary-400 bg-primary-500/15", title: 'Create an Account', desc: 'Register with your email and basic details as a business owner.' },
                { icon: FiShield, color: "text-cyan-400 bg-cyan-500/15", title: 'Complete KYC Verification', desc: 'Upload your Aadhaar, PAN, and a selfie for identity verification.' },
                { icon: FiCheckCircle, color: "text-teal-400 bg-teal-500/15", title: 'Submit Your Business', desc: 'Fill in business details — our AI scores your application, then the community reviews.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start space-x-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon className="text-lg" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-sm text-amber-300">
              <strong>Note:</strong> Login and KYC verification is mandatory for fund raisers. Investors only need to connect their wallet.
            </div>
            {user?.role === 'business_owner' && !user?.isWalletUser ? (
              <button onClick={() => setStep(3)} className="btn-primary w-full">
                Continue to KYC <FiArrowRight className="ml-2" />
              </button>
            ) : (
              <button onClick={() => setStep(2)} className="btn-primary w-full">
                Get Started — Create Account <FiArrowRight className="ml-2" />
              </button>
            )}
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Log in</Link>
            </p>
          </div>
        )}

        {/* Step 2: Register */}
        {step === 2 && (
          <div className="glass-strong rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Create Business Owner Account</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {[
                { icon: FiUser, label: "Full Name", field: "name", type: "text", placeholder: "Your full name" },
                { icon: FiMail, label: "Email", field: "email", type: "email", placeholder: "you@example.com" },
                { icon: FiLock, label: "Password", field: "password", type: "password", placeholder: "Min 8 chars with a number" },
                { icon: FiPhone, label: "Phone (optional)", field: "phone", type: "text", placeholder: "10-digit mobile" },
              ].map(({ icon: Icon, label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                    <input {...register(field)} type={type} className={`${inpCls} pl-10`} placeholder={placeholder} />
                  </div>
                  {errors[field] && <p className="text-red-400 text-xs mt-1">{errors[field].message}</p>}
                </div>
              ))}
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2 disabled:opacity-50">
                {isSubmitting ? 'Creating Account...' : 'Create Account & Continue'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              Already registered?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Log in</Link>
            </p>
          </div>
        )}

        {/* Step 3: KYC */}
        {step === 3 && (
          <div className="glass-strong rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-500/15 border border-amber-500/25">
              <FiShield className="text-amber-400 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Complete KYC Verification</h2>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto">
              To list your business and raise funds, verify your identity. This protects investors and ensures trust on the platform.
            </p>
            <Link to="/kyc" className="btn-primary">Complete KYC Now</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RaiseFundsPage;

