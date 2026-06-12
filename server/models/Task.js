const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

const AttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: { type: String, required: true },
  publicId: { type: String },
  fileType: { type: String },
  size: { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: [200, 'Title cannot exceed 200 characters'] },
  description: { type: String, maxlength: [5000, 'Description cannot exceed 5000 characters'], default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['pending', 'in-progress', 'review', 'completed'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  dueDate: { type: Date },
  category: { type: String, maxlength: [50, 'Category cannot exceed 50 characters'], default: '' },
  tags: [{ type: String, maxlength: 30 }],
  attachments: [AttachmentSchema],
  subtasks: [SubtaskSchema],
  position: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual: completion percentage based on subtasks
TaskSchema.virtual('completionPercentage').get(function () {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  const completed = this.subtasks.filter(s => s.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Set completedAt when status changes to completed
TaskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = undefined;
    }
  }
  next();
});

TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ workspace: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ creator: 1 });

module.exports = mongoose.model('Task', TaskSchema);
