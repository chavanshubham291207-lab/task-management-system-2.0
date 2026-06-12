const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Project name is required'], trim: true, maxlength: [100, 'Name cannot exceed 100 characters'] },
  description: { type: String, maxlength: [1000, 'Description cannot exceed 1000 characters'], default: '' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'completed', 'on-hold', 'archived'], default: 'active' },
  color: { type: String, default: '#7c3aed' },
  deadline: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ProjectSchema.index({ workspace: 1 });
ProjectSchema.index({ owner: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
