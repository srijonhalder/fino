import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll unread count every 60 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/api/users/me/notifications/count');
        setUnreadCount(res.data?.data?.count || 0);
      } catch { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users/me/notifications?limit=5');
      setNotifications(res.data?.data?.notifications || []);
    } catch { }
    setLoading(false);
  };

  const handleToggle = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/users/me/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { }
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/api/users/me/notifications/${id}`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { }
  };

  const typeColors = {
    new_proposal: 'bg-blue-100 text-blue-600',
    vote_reminder: 'bg-yellow-100 text-yellow-600',
    proposal_passed: 'bg-green-100 text-green-600',
    proposal_rejected: 'bg-red-100 text-red-600',
    business_approved: 'bg-green-100 text-green-600',
    business_rejected: 'bg-red-100 text-red-600',
    dividend_received: 'bg-emerald-100 text-emerald-600',
  };

  const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100">
        <FiBell className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <FiCheckCircle className="text-xs" /> Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div key={n._id}
                  className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full font-medium ${typeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                      {n.type?.replace(/_/g, ' ')}
                    </span>
                    {!n.read && (
                      <button onClick={() => markOneRead(n._id)} title="Mark as read"
                        className="ml-auto text-gray-400 hover:text-primary-600 flex-shrink-0">
                        <FiCheck className="text-sm" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{n.message}</p>
                  <span className="text-[11px] text-gray-400 mt-1 block">{timeSince(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 text-center">
              <Link to="/governance" onClick={() => setOpen(false)}
                className="text-xs text-primary-600 hover:underline">
                View Governance Activity
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
