import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../hooks/useWallet';
import { ADMIN_WALLET } from '../../context/AuthContext';
import { FiMenu, FiX, FiLogOut, FiUser, FiChevronDown, FiLink } from 'react-icons/fi';
import NotificationBell from './NotificationBell';
import finoLogo from '../../assets/fino-logo-white.png';

const NAV_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/governance', label: 'Governance' },
  { to: '/raise-funds', label: 'Raise Funds' },
  { to: '/wallet', label: 'Wallet' },
];

const DropItem = ({ to, label, accent, onClick }) => {
  const colorClass =
    accent === 'yellow' ? 'text-yellow-400 hover:bg-yellow-500/10' :
    accent === 'primary' ? 'text-primary-400 hover:bg-primary-500/10' :
    'text-gray-300 hover:bg-white/6';
  return (
    <Link to={to} onClick={onClick} className={`block px-4 py-2 text-sm rounded-lg mx-1 transition-colors ${colorClass}`}>
      {label}
    </Link>
  );
};

const MobileLink = ({ to, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/6 rounded-xl transition-colors"
  >
    {label}
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { walletAddress, isConnected, disconnectWallet, connectWallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const normalizedWalletAddress =
    typeof walletAddress === 'string'
      ? walletAddress
      : walletAddress?.publicKey || walletAddress?.address || walletAddress?.walletAddress || '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleDisconnect = () => {
    disconnectWallet();
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const isAdmin =
    user?.role === 'admin' ||
    normalizedWalletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const shortAddr = normalizedWalletAddress
    ? `${normalizedWalletAddress.slice(0, 4)}…${normalizedWalletAddress.slice(-4)}`
    : 'Connected';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? 'bg-dark-900/95 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <img src={finoLogo} alt="Fino" className="h-7 w-auto" />
            <span className="text-xl font-semibold tracking-tight text-white">
              Fino
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                  location.pathname.startsWith(l.to)
                    ? 'text-white bg-white/8'
                    : 'text-gray-400 hover:text-white hover:bg-white/6'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-white/90 text-dark-900 rounded-lg text-sm font-semibold px-5 h-9 transition-colors"
              >
                <FiLink size={13} />
                Connect Wallet
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono text-gray-300 bg-white/6 border border-white/8">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
                  <span>{shortAddr}</span>
                </div>
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white transition-all hover:bg-white/6 border border-white/8"
                  >
                    <FiUser size={14} />
                    <span>{user?.name?.split(' ')[0] || 'Account'}</span>
                    <FiChevronDown size={13} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-60 rounded-xl py-2 border border-white/10 bg-dark-800 card-shadow"
                      >
                        {isAdmin ? (
                          <DropItem to="/admin" label="Admin Panel" onClick={() => setDropdownOpen(false)} />
                        ) : (
                          <>
                            <DropItem to="/dashboard/investor" label="My Portfolio" onClick={() => setDropdownOpen(false)} />
                            <DropItem to="/dividends" label="Dividend History" onClick={() => setDropdownOpen(false)} />
                            <DropItem to="/governance/my-votes" label="My Votes" onClick={() => setDropdownOpen(false)} />
                            {user?.kycStatus !== 'verified' && (
                              <DropItem to="/kyc" label="Complete KYC" accent="yellow" onClick={() => setDropdownOpen(false)} />
                            )}
                            <div className="my-1 mx-3 h-px bg-white/8" />
                            {user?.role === 'business_owner' && (
                              <>
                                <DropItem to="/dashboard/business" label="My Businesses" onClick={() => setDropdownOpen(false)} />
                                <DropItem to="/apply-funding" label="Apply for Funding" onClick={() => setDropdownOpen(false)} />
                              </>
                            )}
                          </>
                        )}
                        <div className="my-1 mx-3 h-px bg-white/8" />
                        <button
                          onClick={handleDisconnect}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-lg"
                        >
                          <FiLogOut size={14} />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/6 transition-colors text-gray-300"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-[600px] pb-6' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-1 pt-4 border-t border-white/10">
            {NAV_LINKS.map((l) => (
              <MobileLink key={l.to} to={l.to} label={l.label} onClick={() => setMobileOpen(false)} />
            ))}
            <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/10">
              {!isConnected ? (
                <button
                  onClick={() => { connectWallet(); setMobileOpen(false); }}
                  className="w-full rounded-lg text-sm font-semibold py-2.5 bg-white text-dark-900 flex items-center justify-center gap-2 transition-all"
                >
                  <FiLink size={14} />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <>
                  <div className="px-3 py-2 rounded-lg text-sm font-mono text-gray-400 flex items-center gap-2 bg-white/4 border border-white/8">
                    <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                    <span className="truncate">{shortAddr}</span>
                  </div>
                  {isAdmin ? (
                    <MobileLink to="/admin" label="Admin Panel" onClick={() => setMobileOpen(false)} />
                  ) : (
                    <>
                      <MobileLink to="/dashboard/investor" label="My Portfolio" onClick={() => setMobileOpen(false)} />
                      <MobileLink to="/dividends" label="Dividend History" onClick={() => setMobileOpen(false)} />
                      <MobileLink to="/governance/my-votes" label="My Votes" onClick={() => setMobileOpen(false)} />
                      {user?.kycStatus !== 'verified' && (
                        <MobileLink to="/kyc" label="Complete KYC" onClick={() => setMobileOpen(false)} />
                      )}
                      {user?.role === 'business_owner' && (
                        <MobileLink to="/dashboard/business" label="My Businesses" onClick={() => setMobileOpen(false)} />
                      )}
                    </>
                  )}
                  <button
                    onClick={() => { handleDisconnect(); setMobileOpen(false); }}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/8 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <FiLogOut size={14} />
                    <span>Disconnect</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
