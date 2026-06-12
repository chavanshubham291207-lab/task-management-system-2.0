import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch current user and workspaces if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // Get user details
        const userRes = await api.get('/auth/me');
        setUser(userRes.data.user);

        // Get workspaces
        const wsRes = await api.get('/workspaces');
        setWorkspaces(wsRes.data.workspaces);
        
        // Load active workspace from storage or pick first
        const savedWsId = localStorage.getItem('activeWorkspaceId');
        const active = wsRes.data.workspaces.find(w => w._id === savedWsId) || wsRes.data.workspaces[0];
        if (active) {
          setActiveWorkspace(active);
          localStorage.setItem('activeWorkspaceId', active._id);
          // Fetch projects for this workspace
          const projRes = await api.get(`/projects?workspaceId=${active._id}`);
          setProjects(projRes.data.projects);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // Sync projects when active workspace changes
  const changeActiveWorkspace = async (workspace) => {
    setActiveWorkspace(workspace);
    setActiveProject(null);
    if (workspace) {
      localStorage.setItem('activeWorkspaceId', workspace._id);
      try {
        const projRes = await api.get(`/projects?workspaceId=${workspace._id}`);
        setProjects(projRes.data.projects);
      } catch (err) {
        console.error('Error fetching workspace projects:', err);
      }
    } else {
      localStorage.removeItem('activeWorkspaceId');
      setProjects([]);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (googleUserData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', googleUserData);
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      return { success: true };
    } catch (err) {
      console.error('Google login error:', err);
      return { success: false, message: err.response?.data?.message || 'Google login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    localStorage.removeItem('activeWorkspaceId');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setProjects([]);
    setActiveProject(null);
  };

  const refreshWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data.workspaces);
      if (activeWorkspace) {
        const updated = res.data.workspaces.find(w => w._id === activeWorkspace._id);
        if (updated) {
          setActiveWorkspace(updated);
        } else if (res.data.workspaces.length > 0) {
          changeActiveWorkspace(res.data.workspaces[0]);
        }
      } else if (res.data.workspaces.length > 0) {
        changeActiveWorkspace(res.data.workspaces[0]);
      }
    } catch (err) {
      console.error('Error refreshing workspaces:', err);
    }
  };

  const refreshProjects = async () => {
    if (!activeWorkspace) return;
    try {
      const res = await api.get(`/projects?workspaceId=${activeWorkspace._id}`);
      setProjects(res.data.projects);
      if (activeProject) {
        const updated = res.data.projects.find(p => p._id === activeProject._id);
        if (updated) setActiveProject(updated);
      }
    } catch (err) {
      console.error('Error refreshing projects:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        loading,
        workspaces,
        activeWorkspace,
        changeActiveWorkspace,
        projects,
        activeProject,
        setActiveProject,
        login,
        register,
        googleLogin,
        logout,
        refreshWorkspaces,
        refreshProjects,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
