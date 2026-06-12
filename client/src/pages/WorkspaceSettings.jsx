import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  UserPlus,
  Mail,
  Trash2,
  Crown,
  Shield,
  User,
  Edit2,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_ICONS = {
  owner: { icon: Crown, color: 'text-amber-500 bg-amber-500/10' },
  admin: { icon: Shield, color: 'text-brand-500 bg-brand-500/10' },
  member: { icon: User, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
};

export default function WorkspaceSettings() {
  const { user, activeWorkspace, refreshWorkspaces, changeActiveWorkspace } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Workspace Edits State
  const [editMode, setEditMode] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsColor, setWsColor] = useState('#7c3aed');

  // Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const currentUserRole = members.find(m => m.user?._id === user?._id)?.role;
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name);
      setWsDesc(activeWorkspace.description || '');
      setWsColor(activeWorkspace.color || '#7c3aed');
      fetchMembers();
    }
  }, [activeWorkspace]);

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await api.get(`/workspaces/${activeWorkspace._id}/members`);
      setMembers(res.data.members);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/workspaces/${activeWorkspace._id}`, {
        name: wsName,
        description: wsDesc,
        color: wsColor,
      });
      toast.success('Workspace updated!');
      await refreshWorkspaces();
      setEditMode(false);
    } catch (err) {
      toast.error('Failed to update workspace');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.post(`/workspaces/${activeWorkspace._id}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}/members/${userId}`);
      setMembers(members.filter(m => m.user._id !== userId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.put(`/workspaces/${activeWorkspace._id}/members/${userId}/role`, { role: newRole });
      setMembers(members.map(m => m.user._id === userId ? { ...m, role: newRole } : m));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!window.confirm(`Permanently delete "${activeWorkspace.name}"? This will delete all projects and tasks.`)) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}`);
      toast.success('Workspace deleted');
      await refreshWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center text-slate-500 italic">No workspace selected.</div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-8 overflow-y-auto max-w-3xl mx-auto w-full">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
          Workspace Settings <Settings className="w-5 h-5 text-brand-500" />
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Manage your workspace, team, and permissions.
        </p>
      </div>

      {/* Workspace Info Card */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white font-outfit text-sm">Workspace Info</h3>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-400 transition"
            >
              {editMode ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              <span>{editMode ? 'Cancel' : 'Edit'}</span>
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleUpdateWorkspace} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Workspace Name</label>
              <input
                type="text"
                value={wsName}
                onChange={e => setWsName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={wsDesc}
                onChange={e => setWsDesc(e.target.value)}
                rows="3"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Workspace Color</label>
              <div className="flex gap-2.5">
                {['#7c3aed', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWsColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition ${wsColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: activeWorkspace.color }}>
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-outfit">{activeWorkspace.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{activeWorkspace.description || 'No description provided.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Card */}
      {isOwnerOrAdmin && (
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-slate-900 dark:text-white font-outfit text-sm mb-4 flex items-center gap-2">
            <UserPlus className="w-4.5 h-4.5 text-brand-500" /> Invite Member
          </h3>
          <form onSubmit={handleInviteMember} className="flex flex-col gap-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-44">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 px-3 py-2.5 rounded-xl text-xs focus:outline-none"
                >
                  {isOwner && <option value="admin">Admin</option>}
                  <option value="member">Member</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List Card */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="font-bold text-slate-900 dark:text-white font-outfit text-sm mb-4">
          Team Members ({members.length})
        </h3>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map(member => {
              const roleConfig = ROLE_ICONS[member.role] || ROLE_ICONS.member;
              const RoleIcon = roleConfig.icon;
              const isSelf = member.user._id === user?._id;
              const canModify = isOwner && !isSelf && member.role !== 'owner';

              return (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.user.name}`}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      alt=""
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{member.user.name}</span>
                        {isSelf && <span className="text-[9px] bg-brand-500/10 text-brand-500 font-bold px-1.5 py-0.5 rounded-full">You</span>}
                      </div>
                      <span className="text-[10px] text-slate-500">{member.user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${roleConfig.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>

                    {canModify && (
                      <>
                        <select
                          value={member.role}
                          onChange={e => handleChangeRole(member.user._id, e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-[10px] font-semibold focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone - Delete Workspace */}
      {isOwner && (
        <div className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 rounded-3xl p-6">
          <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4.5 h-4.5" /> Danger Zone
          </h3>
          <p className="text-xs text-rose-500/80 mb-4">
            Deleting this workspace is permanent and will remove all projects, tasks, and data associated with it.
          </p>
          <button
            onClick={handleDeleteWorkspace}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Delete Workspace
          </button>
        </div>
      )}
    </div>
  );
}
