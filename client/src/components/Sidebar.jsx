import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Columns3,
  LayoutDashboard,
  Calendar,
  ListTodo,
  Settings,
  Plus,
  ChevronDown,
  LogOut,
  Folder,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const {
    user,
    workspaces,
    activeWorkspace,
    changeActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    logout,
    refreshWorkspaces,
    refreshProjects,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#7c3aed');

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#10b981');

  // Pomodoro State
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState('work'); // work, short-break, long-break
  const [customPomoMinutes, setCustomPomoMinutes] = useState(25);

  // Pomodoro countdown timer
  useEffect(() => {
    let interval = null;
    if (pomoActive && pomoTime > 0) {
      interval = setInterval(() => {
        setPomoTime(prev => prev - 1);
      }, 1000);
    } else if (pomoTime === 0 && pomoActive) {
      setPomoActive(false);
      handlePomodoroCompletion();
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoTime]);

  const handlePomodoroCompletion = () => {
    toast.success(pomoMode === 'work' ? 'Time to take a break!' : 'Break over, time to focus!', {
      duration: 6000,
      icon: '🔔',
    });
    // Trigger alarm sound or notification
    if (pomoMode === 'work') {
      setPomoMode('short-break');
      setPomoTime(5 * 60);
    } else {
      setPomoMode('work');
      setPomoTime(25 * 60);
    }
  };

  const startPomo = () => setPomoActive(true);
  const pausePomo = () => setPomoActive(false);
  const resetPomo = () => {
    setPomoActive(false);
    setPomoTime(customPomoMinutes * 60);
  };

  const handleCustomMinutesChange = (e) => {
    const min = Math.max(1, Math.min(180, parseInt(e.target.value) || 25));
    setCustomPomoMinutes(min);
    if (!pomoActive) {
      setPomoTime(min * 60);
    }
  };

  const changePomoMode = (mode) => {
    setPomoMode(mode);
    setPomoActive(false);
    if (mode === 'work') {
      setPomoTime(customPomoMinutes * 60);
    } else if (mode === 'short-break') {
      setPomoTime(5 * 60);
    } else if (mode === 'long-break') {
      setPomoTime(15 * 60);
    }
  };

  const formatPomoTime = () => {
    const mins = Math.floor(pomoTime / 60);
    const secs = pomoTime % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post('/workspaces', {
        name: newWorkspaceName,
        description: newWorkspaceDesc,
        color: newWorkspaceColor,
      });
      toast.success('Workspace created!');
      await refreshWorkspaces();
      changeActiveWorkspace(res.data.workspace);
      setShowCreateWorkspace(false);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
    } catch (err) {
      toast.error('Workspace creation failed');
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !activeWorkspace) return;
    try {
      const res = await api.post('/projects', {
        name: newProjectName,
        description: newProjectDesc,
        color: newProjectColor,
        workspaceId: activeWorkspace._id,
      });
      toast.success('Project created!');
      await refreshProjects();
      setActiveProject(res.data.project);
      setShowCreateProject(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err) {
      toast.error('Project creation failed');
    }
  };

  const handleWorkspaceSelect = (ws) => {
    changeActiveWorkspace(ws);
    setShowWorkspaceDropdown(false);
  };

  const handleProjectSelect = (proj) => {
    if (activeProject?._id === proj._id) {
      setActiveProject(null);
    } else {
      setActiveProject(proj);
      navigate('/kanban'); // Navigate to board view for the project
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Kanban Board', path: '/kanban', icon: Columns3 },
    { name: 'List View', path: '/tasks', icon: ListTodo },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Workspace settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col h-screen overflow-y-auto shrink-0 select-none z-10">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none font-outfit">TaskFlow Pro</h1>
          <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">Enterprise SaaS</span>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="px-4 py-4 relative border-b border-slate-800/50">
        <button
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="w-full flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/30 rounded-xl px-3.5 py-2.5 transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
              style={{ backgroundColor: activeWorkspace?.color || '#7c3aed' }}
            />
            <span className="font-semibold text-white truncate text-sm">
              {activeWorkspace?.name || 'Loading workspaces...'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showWorkspaceDropdown && (
          <div className="absolute top-full left-4 right-4 mt-2.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {workspaces.map(ws => (
              <button
                key={ws._id}
                onClick={() => handleWorkspaceSelect(ws)}
                className={`w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-700/60 transition-colors text-left text-sm ${activeWorkspace?._id === ws._id ? 'text-brand-400 font-semibold' : 'text-slate-300'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
            <div className="border-t border-slate-700/50 my-1.5" />
            <button
              onClick={() => {
                setShowCreateWorkspace(true);
                setShowWorkspaceDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-700/60 text-brand-400 hover:text-brand-300 font-medium transition-colors text-left text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="px-3 py-4 flex-1 flex flex-col gap-1">
        {menuItems.map(item => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600/10 text-brand-400 shadow-sm border border-brand-500/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        {/* Projects Section */}
        <div className="mt-5">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Projects</span>
            <button
              onClick={() => setShowCreateProject(true)}
              className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5 max-h-44 overflow-y-auto">
            {projects.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic px-3 py-1">No active projects</span>
            ) : (
              projects.map(proj => (
                <button
                  key={proj._id}
                  onClick={() => handleProjectSelect(proj)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border border-transparent ${
                    activeProject?._id === proj._id
                      ? 'bg-slate-800 text-white border-slate-700/50'
                      : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: proj.color }} />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {proj.taskCount > 0 && (
                    <span className="text-[9px] bg-slate-800 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                      {Math.round((proj.completedCount / proj.taskCount) * 100)}%
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </nav>

      {/* Pomodoro Timer widget */}
      <div className="p-3 border-t border-slate-800/50 bg-slate-950/20">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Timer className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold text-white">Focus Timer</span>
          </div>

          <div className="text-2xl font-bold font-mono text-brand-400 tracking-wider mb-2.5">
            {formatPomoTime()}
          </div>

          <div className="flex gap-1.5 mb-3.5 w-full justify-center">
            <button
              onClick={() => changePomoMode('work')}
              className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition ${pomoMode === 'work' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              Focus
            </button>
            <button
              onClick={() => changePomoMode('short-break')}
              className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition ${pomoMode === 'short-break' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              Break
            </button>
          </div>

          <div className="flex gap-2">
            {!pomoActive ? (
              <button
                onClick={startPomo}
                className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white transition shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            ) : (
              <button
                onClick={pausePomo}
                className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center text-white transition shadow-lg"
              >
                <Pause className="w-3.5 h-3.5 fill-white" />
              </button>
            )}
            <button
              onClick={resetPomo}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1">
            <span className="text-[9px] text-slate-500">Mins:</span>
            <input
              type="number"
              min="1"
              max="180"
              value={customPomoMinutes}
              onChange={handleCustomMinutesChange}
              className="w-10 bg-slate-900 border border-slate-700/60 rounded px-1 text-[10px] font-semibold text-center text-slate-300 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* User Footer profile details */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 mt-auto">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
            alt=""
          />
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate leading-tight">{user?.name}</h4>
            <span className="text-[10px] text-slate-500 truncate block">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/40 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-slate-300 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white font-outfit mb-3">Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Design Agency"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Description</label>
                <textarea
                  value={newWorkspaceDesc}
                  onChange={e => setNewWorkspaceDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="Tell your team about this workspace..."
                  rows="3"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Theme Color</label>
                <div className="flex gap-2.5">
                  {['#7c3aed', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewWorkspaceColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${newWorkspaceColor === c ? 'border-white' : 'border-transparent'} transition`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkspace(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-slate-300 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white font-outfit mb-3">Create Project</h3>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="Project details..."
                  rows="3"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Project Color</label>
                <div className="flex gap-2.5">
                  {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjectColor(c)}
                      className={`w-7 h-7 rounded-full border-2 ${newProjectColor === c ? 'border-white' : 'border-transparent'} transition`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="px-4 py-2 text-xs font-semibold hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
