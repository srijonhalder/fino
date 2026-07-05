import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import WalletAuthBridge from './components/common/WalletAuthBridge';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';
import RoleRoute from './components/common/RoleRoute';
import WalletRoute from './components/common/WalletRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import ExplorePage from './pages/public/ExplorePage';
import BusinessDetailPage from './pages/public/BusinessDetailPage';
import WalletDemoPage from './pages/public/WalletDemoPage';
import NotFoundPage from './pages/public/NotFoundPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import KYCPage from './pages/auth/KYCPage';
import RaiseFundsPage from './pages/auth/RaiseFundsPage';

// Investor Pages
import InvestorDashboard from './pages/investor/InvestorDashboard';
import DividendHistoryPage from './pages/investor/DividendHistoryPage';

// Business Owner Pages
import BusinessOwnerDashboard from './pages/business/BusinessOwnerDashboard';
import ApplyFundingPage from './pages/business/ApplyFundingPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BusinessApprovalPage from './pages/admin/BusinessApprovalPage';
import RevenueVerificationPage from './pages/admin/RevenueVerificationPage';

// Governance Pages
import GovernancePage from './pages/governance/GovernancePage';
import ProposalDetailPage from './pages/governance/ProposalDetailPage';
import MyVotesPage from './pages/governance/MyVotesPage';
import DocumentVerificationPage from './pages/governance/DocumentVerificationPage';
import GovernanceAnalyticsPage from './pages/governance/GovernanceAnalyticsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
              <AuthProvider>
                <WalletProvider>
                  <WalletAuthBridge />
                  <div className="min-h-screen flex flex-col bg-dark-900">
                    <Navbar />
                    <main className="flex-1">
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/businesses/:id" element={<BusinessDetailPage />} />
                        <Route path="/wallet" element={<WalletDemoPage />} />

                        {/* Auth Pages (for fund raisers / business owners) */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/raise-funds" element={<RaiseFundsPage />} />
                        <Route path="/kyc" element={<PrivateRoute><KYCPage /></PrivateRoute>} />

                        {/* Investor Routes — just need wallet connected */}
                        <Route path="/dashboard/investor" element={<WalletRoute><InvestorDashboard /></WalletRoute>} />
                        <Route path="/dividends" element={<WalletRoute><DividendHistoryPage /></WalletRoute>} />

                        {/* Business Owner Routes — need login + KYC */}
                        <Route path="/dashboard/business" element={<RoleRoute roles={['business_owner']}><BusinessOwnerDashboard /></RoleRoute>} />
                        <Route path="/apply-funding" element={<RoleRoute roles={['business_owner']}><ApplyFundingPage /></RoleRoute>} />

                        {/* Governance Routes — public browse, wallet to vote */}
                        <Route path="/governance" element={<GovernancePage />} />
                        <Route path="/governance/proposals/:id" element={<ProposalDetailPage />} />
                        <Route path="/governance/my-votes" element={<WalletRoute><MyVotesPage /></WalletRoute>} />
                        <Route path="/governance/analytics" element={<GovernanceAnalyticsPage />} />
                        <Route path="/verify/:businessId" element={<DocumentVerificationPage />} />

                        {/* Admin Routes — admin wallet only */}
                        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                        <Route path="/admin/applications" element={<AdminRoute><BusinessApprovalPage /></AdminRoute>} />
                        <Route path="/admin/revenue" element={<AdminRoute><RevenueVerificationPage /></AdminRoute>} />

                        {/* 404 */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </main>
                    <Footer />
                  </div>
                  <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    pauseOnHover
                    theme="dark"
                    toastStyle={{
                      background: 'rgba(17,24,39,0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#E5E7EB',
                    }}
                  />
                </WalletProvider>
              </AuthProvider>
            </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
