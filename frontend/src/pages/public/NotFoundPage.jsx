import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

const NotFoundPage = () => (
  <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
    {/* Background orbs */}
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-32 -left-32" />
      <div className="glow-orb w-80 h-80 bg-cyan-500 absolute -bottom-24 -right-24" />
    </div>

    <div className="text-center relative z-10">
      <div className="text-[10rem] font-black leading-none gradient-text select-none">404</div>
      <h2 className="text-3xl font-bold text-white mt-2 mb-3">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        <FiHome className="mr-2" /> Back to Home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
