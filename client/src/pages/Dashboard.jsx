import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Target,
  Sparkles,
  ChevronRight,
  Zap,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { activeWorkspace } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Focus Mode State
  const [focusMode, setFocusMode] = useState(false);
  const [focusTime, setFocusTime] = useState(25 * 60);
  const [focusActive, setFocusActive] = useState(false);

  // Habits Tracker State
  const [habits, setHabits] = useState([
    { id: 1, name: 'Drink 3L Water', done: false },
    { id: 2, name: 'Read for 20 mins', done: false },
    { id: 3, name: 'Code every day', done: true },
    { id: 4, name: '8 hrs Sleep', done: false }
  ]);

  // Daily & Weekly Goals State
  const [goals, setGoals] = useState({
    daily: 3,
    weekly: 15,
  });

  // Fetch Workspace Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!activeWorkspace) return;
      setLoading(true);
      try {
        const res = await api.get(`/tasks?workspaceId=${activeWorkspace._id}`);
        setTasks(res.data.tasks);
      } catch (err) {
        console.error('Error fetching tasks for dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [activeWorkspace]);

  // Focus mode countdown
  useEffect(() => {
    let interval = null;
    if (focusActive && focusTime > 0) {
      interval = setInterval(() => {
        setFocusTime(prev => prev - 1);
      }, 1000);
    } else if (focusTime === 0 && focusActive) {
      setFocusActive(false);
      toast.success('Focus session completed! Nice job.', { icon: '🏆' });
    }
    return () => clearInterval(interval);
  }, [focusActive, focusTime]);

  const toggleHabit = (id) => {
    setHabits(habits.map(h => h.id === id ? { ...h, done: !h.done } : h));
    toast.success('Habit updated!', { duration: 1500 });
  };

  const handleStartFocus = () => setFocusActive(true);
  const handlePauseFocus = () => setFocusActive(false);
  const handleResetFocus = () => {
    setFocusActive(false);
    setFocusTime(25 * 60);
  };

  // Compute analytics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;

  const checkOverdue = (task) => {
    if (task.status === 'completed' || !task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };
  const overdueTasks = tasks.filter(checkOverdue).length;

  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Productivity Score: Completed tasks multiply by priority values (Urgent = 40, High = 30, Medium = 20, Low = 10)
  const computeProductivityScore = () => {
    const completed = tasks.filter(t => t.status === 'completed');
    if (!completed.length) return 0;
    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
    const score = completed.reduce((acc, t) => acc + (priorityWeights[t.priority] || 2), 0);
    return Math.min(100, Math.round((score / (tasks.length * 2)) * 100) || 0);
  };

  const productivityScore = computeProductivityScore();

  // Streak calculation (simulate a streak based on completed tasks)
  const streak = completedTasks > 0 ? 5 : 0;

  // Chart 1: Status Distribution
  const statusCounts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    completed: completedTasks,
  };

  const pieData = [
    { name: 'Pending', value: statusCounts.pending, color: '#f59e0b' },
    { name: 'In Progress', value: statusCounts['in-progress'], color: '#3b82f6' },
    { name: 'Review', value: statusCounts.review, color: '#a78bfa' },
    { name: 'Completed', value: statusCounts.completed, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Chart 2: Weekly Activity Data
  const weeklyData = [
    { name: 'Mon', completed: Math.round(completedTasks * 0.1), active: Math.round(totalTasks * 0.4) },
    { name: 'Tue', completed: Math.round(completedTasks * 0.2), active: Math.round(totalTasks * 0.5) },
    { name: 'Wed', completed: Math.round(completedTasks * 0.4), active: Math.round(totalTasks * 0.6) },
    { name: 'Thu', completed: Math.round(completedTasks * 0.5), active: Math.round(totalTasks * 0.7) },
    { name: 'Fri', completed: Math.round(completedTasks * 0.7), active: Math.round(totalTasks * 0.8) },
    { name: 'Sat', completed: Math.round(completedTasks * 0.9), active: Math.round(totalTasks * 0.9) },
    { name: 'Sun', completed: completedTasks, active: totalTasks }
  ];

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl md:col-span-2" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-brand-600/10 via-brand-600/5 to-transparent border border-brand-500/10 rounded-3xl p-6">
        <div>
          <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
            Welcome to {activeWorkspace?.name} <Sparkles className="w-5 h-5 text-brand-500" />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            You have {pendingTasks} open tasks. Completion rate is currently at {completionRate}%.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            <div className="text-left leading-none">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{streak} Days</span>
              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Streak</span>
            </div>
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition"
          >
            {focusMode ? 'Normal View' : 'Focus Mode'}
          </button>
        </div>
      </div>

      {focusMode ? (
        /* Focus Mode View */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center max-w-xl mx-auto w-full text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-xl font-bold text-white font-outfit mb-2 flex items-center gap-2">
            Focus Session <Zap className="w-5 h-5 text-brand-400" />
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mb-8">Block distractions and dive deep into your tasks.</p>

          <div className="text-6xl font-bold font-mono text-brand-400 tracking-widest mb-8">
            {Math.floor(focusTime / 60).toString().padStart(2, '0')}:{(focusTime % 60).toString().padStart(2, '0')}
          </div>

          <div className="flex gap-4">
            {!focusActive ? (
              <button
                onClick={handleStartFocus}
                className="bg-brand-600 hover:bg-brand-500 px-6 py-3 rounded-2xl font-semibold text-xs text-white transition flex items-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-white" /> Start Session
              </button>
            ) : (
              <button
                onClick={handlePauseFocus}
                className="bg-amber-600 hover:bg-amber-500 px-6 py-3 rounded-2xl font-semibold text-xs text-white transition flex items-center gap-2 shadow-lg"
              >
                Pause
              </button>
            )}
            <button
              onClick={handleResetFocus}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-750 px-6 py-3 rounded-2xl font-semibold text-xs text-slate-300 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      ) : (
        /* Standard Dashboard View */
        <>
          {/* Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Tasks', value: totalTasks, icon: TrendingUp, color: 'text-brand-500 bg-brand-500/10' },
              { title: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
              { title: 'Pending', value: pendingTasks, icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
              { title: 'Overdue', value: overdueTasks, icon: AlertTriangle, color: 'text-rose-500 bg-rose-500/10' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">{stat.title}</span>
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-outfit">{stat.value}</span>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5.5 h-5.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Main Grid: Charts & Productive Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Productivity Chart */}
            <div className="glass-card rounded-3xl p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-outfit mb-4">Productivity Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="pomoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff' }} />
                    <Area type="monotone" dataKey="completed" name="Completed Tasks" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#pomoGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Status Distribution Chart */}
            <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-outfit mb-2">Status Split</h3>
              {pieData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500 italic">No task data available</div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span>{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Productivity Goals and Habits */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-outfit">Productivity Goals</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Daily Completion Goal</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {Math.min(goals.daily, completedTasks)} / {goals.daily}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (completedTasks / goals.daily) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Workspace Productivity Score</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{productivityScore}/100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${productivityScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Habit Tracker */}
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-outfit mb-4">Daily Habit Tracker</h3>
              <div className="flex flex-col gap-3">
                {habits.map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition text-left ${
                      habit.done
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span>{habit.name}</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] ${
                      habit.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}>
                      {habit.done && '✓'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Shortcuts Widget */}
            <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-outfit mb-2">Focus Mode</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deep work sessions help increase productivity score and help you complete tasks with high focus.
                </p>
              </div>
              <button
                onClick={() => setFocusMode(true)}
                className="w-full bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1"
              >
                <span>Enter Focus Mode</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
