import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  AlertCircle,
  User,
  Plus,
  Trash2,
  Paperclip,
  CheckSquare,
  Copy,
  Archive,
  Download,
  Tag
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TaskModal({ task, onClose, onSave }) {
  const { activeWorkspace, projects } = useAuth();
  const [members, setMembers] = useState([]);
  
  // Form States
  const [title, setTitle] = useState(task ? task.title : '');
  const [desc, setDesc] = useState(task ? task.description : '');
  const [status, setStatus] = useState(task ? task.status : 'pending');
  const [priority, setPriority] = useState(task ? task.priority : 'medium');
  const [dueDate, setDueDate] = useState(task && task.dueDate ? task.dueDate.split('T')[0] : '');
  const [category, setCategory] = useState(task ? task.category : '');
  const [project, setProject] = useState(task && task.project ? (task.project._id || task.project) : '');
  const [selectedAssignees, setSelectedAssignees] = useState(
    task && task.assignees ? task.assignees.map(a => a._id || a) : []
  );

  // Subtasks & Checklist State
  const [subtasks, setSubtasks] = useState(task ? task.subtasks || [] : []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Attachments State
  const [attachments, setAttachments] = useState(task ? task.attachments || [] : []);
  const [uploading, setUploading] = useState(false);

  // Fetch workspace members for assignment
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !activeWorkspace) return;

    const taskData = {
      title,
      description: desc,
      status,
      priority,
      dueDate: dueDate || null,
      category,
      projectId: project || null,
      workspaceId: activeWorkspace._id,
      assignees: selectedAssignees,
      subtasks,
    };

    try {
      if (task) {
        const res = await api.put(`/tasks/${task._id}`, taskData);
        toast.success('Task updated!');
        onSave(res.data.task);
      } else {
        const res = await api.post('/tasks', taskData);
        toast.success('Task created!');
        onSave(res.data.task);
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save task');
    }
  };

  const handleDuplicate = async () => {
    if (!task) return;
    try {
      const res = await api.post(`/tasks/${task._id}/duplicate`);
      toast.success('Task duplicated!');
      onSave(res.data.task);
      onClose();
    } catch (err) {
      toast.error('Failed to duplicate task');
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    try {
      const res = await api.put(`/tasks/${task._id}/archive`);
      toast.success(res.data.task.isArchived ? 'Task archived!' : 'Task restored!');
      onSave(null); // reload list
      onClose();
    } catch (err) {
      toast.error('Failed to archive task');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      onSave(null); // reload list
      onClose();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // Subtask Handlers
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSub = { title: newSubtaskTitle, completed: false };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (index) => {
    const updated = [...subtasks];
    updated[index].completed = !updated[index].completed;
    setSubtasks(updated);
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  // Attachment Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !task) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments([...attachments, res.data.attachment]);
      toast.success('File uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (!task) return;
    try {
      await api.delete(`/tasks/${task._id}/attachments/${attachmentId}`);
      setAttachments(attachments.filter(a => a._id !== attachmentId));
      toast.success('Attachment removed');
    } catch (err) {
      toast.error('Failed to remove attachment');
    }
  };

  const toggleAssignee = (userId) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const progressPercent = subtasks.length
    ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-700 dark:text-slate-300 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-outfit">
            {task ? 'Edit Task' : 'Create Task'}
          </h2>
          <div className="flex items-center gap-2">
            {task && (
              <>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  title="Duplicate Task"
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <Copy className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  title="Archive Task"
                  className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                >
                  <Archive className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  title="Delete Task"
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-5">
          {/* Title & Description */}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              required
              placeholder="Task Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-base font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
            <textarea
              placeholder="Add task description..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows="3"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Project</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">No Project</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category / Tag</label>
              <input
                type="text"
                placeholder="e.g. Design, Frontend"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Assignees Selection */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Assignees</label>
            <div className="flex flex-wrap gap-2">
              {members.map(member => {
                const isAssigned = selectedAssignees.includes(member.user._id);
                return (
                  <button
                    key={member.user._id}
                    type="button"
                    onClick={() => toggleAssignee(member.user._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      isAssigned
                        ? 'bg-brand-600/10 text-brand-500 border-brand-500/30'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-800 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <img
                      src={member.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.user.name}`}
                      className="w-5.5 h-5.5 rounded-full object-cover"
                      alt=""
                    />
                    <span>{member.user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtasks / Checklist</label>
              {subtasks.length > 0 && (
                <span className="text-[10px] font-semibold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">
                  {progressPercent}% Complete
                </span>
              )}
            </div>

            {/* Checklist progress bar */}
            {subtasks.length > 0 && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-3.5 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2.5 mb-2.5">
              {subtasks.map((sub, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => handleToggleSubtask(i)}
                      className="rounded text-brand-500 focus:ring-brand-500 w-4 h-4 border-slate-300"
                    />
                    <span className={`text-xs ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {sub.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 p-2 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center justify-center transition"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          {task && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Attachments</label>
              
              <div className="flex flex-col gap-2 mb-3">
                {attachments.map(att => (
                  <div key={att._id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px] font-medium text-slate-700 dark:text-slate-200">{att.filename}</span>
                      <span className="text-[9px] text-slate-400 uppercase">({att.fileType?.split('/')[1] || 'FILE'})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Download Attachment"
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-slate-700"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att._id)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="task-file-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <label
                  htmlFor="task-file-upload"
                  className="flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/5 dark:hover:bg-brand-500/5 py-3 rounded-2xl cursor-pointer text-xs font-semibold text-slate-500 hover:text-brand-500 transition duration-200"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Attachment (Image, PDF, Doc)'}</span>
                </label>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
