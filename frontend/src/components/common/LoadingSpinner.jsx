import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4">
    <div className="relative w-12 h-12">
      <div
        className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#22D3A5', borderRightColor: '#22D3EE' }}
      />
      <div
        className="absolute inset-2 rounded-full border-2 border-transparent animate-spin"
        style={{ borderTopColor: '#34D399', animationDirection: 'reverse', animationDuration: '0.8s' }}
      />
    </div>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

export default LoadingSpinner;
