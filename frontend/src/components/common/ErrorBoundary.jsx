import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">We're sorry for the inconvenience. Please try refreshing the page.</p>
            <div className="space-x-4">
              <button onClick={() => window.location.reload()} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
                Refresh Page
              </button>
              <a href="/" className="text-primary-600 hover:underline">Go Home</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
