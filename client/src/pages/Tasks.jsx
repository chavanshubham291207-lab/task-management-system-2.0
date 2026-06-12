import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  FileCode,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const PRIORITY_BADGES = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  urgent: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
};

const STATUS_BADGES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
};

export default function Tasks() {
  const { activeWorkspace, activeProject } = useAuth();
  const location = useLocation();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Selection States
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Workspace Members for dropdown
  const [members, setMembers] = useState([]);

  const fetchTasks = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      // Build API query string dynamically to filter both client/server side
      let query = `workspaceId=${activeWorkspace._id}`;
      if (activeProject) query += `&projectId=${activeProject._id}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (priorityFilter) query += `&priority=${priorityFilter}`;
      if (categoryFilter) query += `&category=${categoryFilter}`;
      if (dueDateFilter) query += `&dueDate=${dueDateFilter}`;
      if (assigneeFilter) query += `&assignee=${assigneeFilter}`;
      if (search) query += `&search=${search}`;

      const res = await api.get(`/tasks?${query}`);
      setTasks(res.data.tasks);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [
    activeWorkspace,
    activeProject,
    statusFilter,
    priorityFilter,
    categoryFilter,
    dueDateFilter,
    assigneeFilter,
    search
  ]);

  // Handle opening task modal if navigated here from clicking search in Navbar
  useEffect(() => {
    if (location.state?.openTaskId && tasks.length > 0) {
      const target = tasks.find(t => t._id === location.state.openTaskId);
      if (target) {
        setSelectedTask(target);
        setShowTaskModal(true);
      }
    }
  }, [location.state, tasks]);

  // Fetch members list for filters
  useEffect(() => {
    const fetchMembers = async () => {
      if (!activeWorkspace) return;
      try {
        const res = await api.get(`/workspaces/${activeWorkspace._id}/members`);
        setMembers(res.data.members);
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    };
    fetchMembers();
  }, [activeWorkspace]);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleTaskSaved = () => {
    fetchTasks();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setDueDateFilter('');
    setAssigneeFilter('');
    toast.success('Filters reset');
  };

  // Export 1: Export to CSV
  const handleExportCSV = () => {
    if (tasks.length === 0) return toast.error('No tasks to export');
    const headers = ['Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date'];
    const rows = tasks.map(t => [
      t.title,
      t.description || '',
      t.status,
      t.priority,
      t.category || '',
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported!');
  };

  // Export 2: Export to Excel (XLSX)
  const handleExportExcel = () => {
    if (tasks.length === 0) return toast.error('No tasks to export');
    const formatted = tasks.map(t => ({
      Title: t.title,
      Description: t.description || '',
      Status: t.status,
      Priority: t.priority,
      Category: t.category || '',
      'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `tasks_export_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Excel Sheet Exported!');
  };

  // Export 3: Export to PDF
  const handleExportPDF = () => {
    if (tasks.length === 0) return toast.error('No tasks to export');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Tasks List Report', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
    
    let y = 40;
    tasks.forEach((t, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${i + 1}. ${t.title} [${t.status.toUpperCase()}]`, 14, y);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Priority: ${t.priority} | Category: ${t.category || 'None'} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}`, 14, y + 5);
      y += 15;
    });

    doc.save(`tasks_report_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('PDF Report Generated!');
  };

  return (
    <div className="p-8 flex flex-col h-full overflow-y-auto">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
            Tasks List View <SlidersHorizontal className="w-5 h-5 text-brand-500" />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Filter, search, and export your tasks.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Export buttons */}
          <button
            onClick={handleExportCSV}
            title="Export to CSV"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <FileCode className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleExportExcel}
            title="Export to Excel"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleExportPDF}
            title="Export as PDF Document"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition"
          >
            <FileText className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={handleCreateTask}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg transition flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* Search Input */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 pl-8.5 pr-2 py-1.5 rounded-xl text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            <option value="">All Assignees</option>
            {members.map(m => (
              <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
            ))}
          </select>

          {/* Due date Filter */}
          <select
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            <option value="">All Dates</option>
            <option value="today">Due Today</option>
            <option value="week">Due This Week</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {(statusFilter || priorityFilter || assigneeFilter || dueDateFilter || search) && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Task List / Table Grid */}
      <div className="bg-white/50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-800/50 rounded-2xl overflow-hidden shadow-glass-light dark:shadow-glass-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-6 py-3.5">Task Name</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5">Assignees</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-500 italic">
                    No matching tasks found
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr
                    key={task._id}
                    className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                      {task.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[task.status] || STATUS_BADGES.pending}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full font-medium uppercase text-[10px] tracking-wide ${PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {task.category || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {task.assignees.map((a, idx) => (
                            <img
                              key={idx}
                              src={a.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${a.name}`}
                              className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                              title={a.name}
                              alt=""
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-brand-500"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task detail modal overlay */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => setShowTaskModal(false)}
          onSave={handleTaskSaved}
        />
      )}

    </div>
  );
}
