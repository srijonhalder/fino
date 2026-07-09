import React, { useState } from 'react';
import { FiUser, FiMail, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

/**
 * Modal shown when a new wallet connects for the first time.
 * Requires user to provide name and email before they can invest or vote.
 */
const WalletSignupModal = ({ walletAddress, onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await onSubmit(walletAddress, name.trim(), email.trim());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Signup failed. Please try again.');
    }
  };

  const shortWallet = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Welcome to Fino</h2>
            <button 
              onClick={onCancel}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <p className="text-primary-100 text-sm mt-1">
            Complete your profile to start investing
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Wallet Display */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Connected Wallet</div>
            <div className="font-mono text-sm text-gray-700">{shortWallet}</div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                disabled={isLoading}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              We'll use this for notifications about your investments and votes.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <FiAlertCircle className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>1-Wallet-1-Vote Governance</strong>
            <p className="text-blue-600 mt-1">
              Every registered wallet gets equal voting power. No token purchase required to participate in governance.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiCheck />
                  <span>Complete Signup</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WalletSignupModal;
