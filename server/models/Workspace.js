const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Workspace name is required'], trim: true, maxlength: [100, 'Name cannot exceed 100 characters'] },
  description: { type: String, maxlength: [500, 'Description cannot exceed 500 characters'], default: '' },
  color: { type: String, default: '#7c3aed' },
  avatar: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  inviteToken: { type: String },
  inviteTokenExpire: { type: Date },
  isPersonal: { type: Boolean, default: false },
}, { timestamps: true });

WorkspaceSchema.index({ owner: 1 });
WorkspaceSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
