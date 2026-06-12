import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Save, Lock, Eye, EyeOff, AlertCircle, User, Mail, Briefcase, FileText } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [jobRole, setJobRole] = useState(user?.jobRole || '');
  const [saving, setSaving] = useState(false);

  // Avatar Upload
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [uploading, setUploading] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/users/profile', { name, bio, jobRole });
      setUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);
    try {
      const res = await api.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(prev => ({ ...prev, avatar: res.data.avatar }));
      setAvatarPreview(res.data.avatar);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Avatar upload failed. Cloudinary keys may not be configured.');
      setAvatarPreview(user?.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8 overflow-y-auto max-w-3xl mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold font-outfit text-slate-900 dark:text-white flex items-center gap-2">
          My Profile <User className="w-5 h-5 text-brand-500" />
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Update your account info and security settings.
        </p>
      </div>

      {/* Avatar & Name Display */}
      <div className="glass-card rounded-3xl p-6 flex items-center gap-6">
        <div className="relative group shrink-0">
          <img
            src={avatarPreview || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"
            alt="Profile Avatar"
          />
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer rounded-2xl"
          >
            <Camera className="w-5 h-5 text-white" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={uploading}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-2xl">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-outfit">{user?.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
          {user?.jobRole && (
            <span className="inline-block mt-1.5 text-[10px] font-semibold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">
              {user.jobRole}
            </span>
          )}
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="glass-card rounded-3xl p-6">
        <h3 className="font-bold text-slate-900 dark:text-white font-outfit text-sm mb-5">Personal Information</h3>
        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Job Role</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={jobRole}
                  onChange={e => setJobRole(e.target.value)}
                  placeholder="e.g. Product Manager"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bio</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell your team about yourself..."
                rows="3"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      {!user?.googleId && (
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-slate-900 dark:text-white font-outfit text-sm mb-5 flex items-center gap-2">
            <Lock className="w-4.5 h-4.5 text-brand-500" /> Change Password
          </h3>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs focus:outline-none focus:border-brand-500"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Confirm Password</label>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {newPassword && newPassword !== confirmPassword && (
              <div className="flex items-center gap-2 text-xs text-rose-500">
                <AlertCircle className="w-4 h-4" />
                <span>Passwords do not match</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwLoading || (newPassword && newPassword !== confirmPassword)}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                {pwLoading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
