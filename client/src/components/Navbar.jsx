import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  Bell,
  Search,
  CheckCircle,
  Clock,
  User,
  LogOut,
  ChevronDown,
  Activity,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, activeWorkspace, activeProject, notifications, setNotifications, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const socketRef = useRef(null);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const res = await api.get('/users/notifications');
        setNotifications(res.data.notifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
  }, [user]);

  // Socket.io for Real-time Notifications
  useEffect(() => {
    if (!user) return;

    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join', user._id);
    });

    socketRef.current.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      toast((t) => (
        <div className="flex gap-2">
          <div className="shrink-0 font-bold text-brand-500">🔔</div>
          <div>
            <div className="font-semibold text-slate-900 text-xs">{notification.title}</div>
            <div className="text-slate-500 text-[10px]">{notification.message}</div>
          </div>
        </div>
      ), { duration: 4000 });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  // Global search trigger
  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim().length < 2 || !activeWorkspace) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/tasks?workspaceId=${activeWorkspace._id}&search=${searchQuery}`);
        setSearchResults(res.data.tasks);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Error searching tasks:', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, activeWorkspace]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleTaskClick = (taskId) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate('/tasks', { state: { openTaskId: taskId } });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Page Context Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">{activeWorkspace?.name || 'Workspace'}</span>
        {activeProject && (
          <>
            <span>/</span>
            <span
              className="px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: activeProject.color }}
            >
              {activeProject.name}
            </span>
          </>
        )}
      </div>

      {/* Center Search Bar */}
      <div ref={searchRef} className="relative w-full max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 max-h-60 overflow-y-auto">
            <div className="px-3.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50 mb-1">
              Matching Tasks
            </div>
            {searchResults.map(task => (
              <button
                key={task._id}
                onClick={() => handleTaskClick(task._id)}
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-xs"
              >
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">{task.title}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-wide">
                  {task.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side Settings & Profile */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications Center */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition relative"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-medium text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500 italic">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id)}
                      className={`px-4 py-2.5 border-b border-slate-50 dark:border-slate-800/30 flex gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition ${!n.isRead ? 'bg-brand-500/5 dark:bg-brand-500/5' : ''}`}
                    >
                      <img
                        src={n.sender?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${n.sender?.name || 'System'}`}
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                        alt=""
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{n.title}</span>
                          <span className="text-[9px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2.5 py-1.5 rounded-xl transition"
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
              alt=""
            />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  toast.success('Logged out successfully');
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-left border-t border-slate-100 dark:border-slate-800/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
