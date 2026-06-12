const Task = require('../models/Task');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Helper: create notification + emit socket
const createNotification = async (data, io) => {
  try {
    const notification = await Notification.create(data);
    await notification.populate('sender', 'name avatar');
    if (io) io.to(data.recipient.toString()).emit('notification', notification);
    return notification;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @desc    Create task
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, projectId, workspaceId, status, priority, dueDate, category, tags, assignees } = req.body;
    if (!title || !workspaceId) return res.status(400).json({ success: false, message: 'Title and workspace are required' });
    // Get max position for kanban ordering
    const maxPos = await Task.findOne({ workspace: workspaceId, status: status || 'pending' }).sort({ position: -1 }).select('position');
    const task = await Task.create({
      title, description, project: projectId || null, workspace: workspaceId,
      creator: req.user._id, status: status || 'pending', priority: priority || 'medium',
      dueDate, category, tags: tags || [], assignees: assignees || [],
      position: maxPos ? maxPos.position + 1 : 0,
    });
    await task.populate([{ path: 'creator', select: 'name email avatar' }, { path: 'assignees', select: 'name email avatar' }]);
    const io = req.app.get('io');
    // Notify assignees
    for (const assigneeId of (assignees || [])) {
      if (assigneeId.toString() !== req.user._id.toString()) {
        await createNotification({ recipient: assigneeId, sender: req.user._id, type: 'task_assigned', title: 'New Task Assigned', message: `${req.user.name} assigned you "${title}"`, link: `/tasks/${task._id}`, data: { taskId: task._id } }, io);
      }
    }
    if (io && projectId) io.to(`project_${projectId}`).emit('task_created', task);
    await ActivityLog.create({ user: req.user._id, workspace: workspaceId, project: projectId || null, task: task._id, action: 'task_created', description: `Created task "${title}"` });
    res.status(201).json({ success: true, task, message: 'Task created successfully' });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating task' });
  }
};

// @desc    Get tasks with filters
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { projectId, workspaceId, status, priority, assignee, category, search, dueDate, sort = 'position', page = 1, limit = 50 } = req.query;
    const filter = { isArchived: false };
    if (projectId) filter.project = projectId;
    if (workspaceId) filter.workspace = workspaceId;
    if (status) filter.status = { $in: status.split(',') };
    if (priority) filter.priority = { $in: priority.split(',') };
    if (assignee) filter.assignees = assignee;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }, { tags: { $in: [new RegExp(search, 'i')] } }];
    if (dueDate === 'overdue') filter.dueDate = { $lt: new Date() };
    else if (dueDate === 'today') { const start = new Date(); start.setHours(0,0,0,0); const end = new Date(); end.setHours(23,59,59,999); filter.dueDate = { $gte: start, $lte: end }; }
    else if (dueDate === 'week') { const end = new Date(); end.setDate(end.getDate() + 7); filter.dueDate = { $lte: end }; }
    const sortObj = {};
    if (sort === 'dueDate') sortObj.dueDate = 1;
    else if (sort === 'priority') sortObj.priority = -1;
    else if (sort === '-createdAt') sortObj.createdAt = -1;
    else sortObj.position = 1;
    const tasks = await Task.find(filter)
      .populate('creator', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('project', 'name color')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await Task.countDocuments(filter);
    res.json({ success: true, tasks, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching tasks' });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('creator', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('project', 'name color')
      .populate('workspace', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching task' });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { assignees: newAssignees } = req.body;
    const oldAssignees = task.assignees.map(a => a.toString());
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('creator', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('project', 'name color');
    const io = req.app.get('io');
    // Notify newly added assignees
    if (newAssignees) {
      const addedAssignees = newAssignees.filter(a => !oldAssignees.includes(a.toString()) && a.toString() !== req.user._id.toString());
      for (const assigneeId of addedAssignees) {
        await createNotification({ recipient: assigneeId, sender: req.user._id, type: 'task_assigned', title: 'Task Assigned to You', message: `${req.user.name} assigned you "${task.title}"`, link: `/tasks/${task._id}`, data: { taskId: task._id } }, io);
      }
    }
    if (io) io.to(`project_${task.project}`).emit('task_updated', updated);
    await ActivityLog.create({ user: req.user._id, workspace: task.workspace, project: task.project, task: task._id, action: 'task_updated', description: `Updated task "${task.title}"` });
    res.json({ success: true, task: updated, message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error updating task' });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const io = req.app.get('io');
    await task.deleteOne();
    if (io) io.to(`project_${task.project}`).emit('task_deleted', { taskId: task._id });
    await ActivityLog.create({ user: req.user._id, workspace: task.workspace, project: task.project, action: 'task_deleted', description: `Deleted task "${task.title}"` });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting task' });
  }
};

// @desc    Duplicate task
// @route   POST /api/tasks/:id/duplicate
exports.duplicateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const newTask = await Task.create({
      title: `Copy of ${task.title}`, description: task.description, project: task.project,
      workspace: task.workspace, creator: req.user._id, status: 'pending',
      priority: task.priority, category: task.category, tags: task.tags,
      assignees: task.assignees, subtasks: task.subtasks.map(s => ({ title: s.title, completed: false })),
    });
    await newTask.populate([{ path: 'creator', select: 'name email avatar' }, { path: 'assignees', select: 'name email avatar' }]);
    res.status(201).json({ success: true, task: newTask, message: 'Task duplicated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error duplicating task' });
  }
};

// @desc    Update task status (kanban)
// @route   PUT /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('creator', 'name email avatar')
      .populate('assignees', 'name email avatar');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const io = req.app.get('io');
    if (io) io.to(`project_${task.project}`).emit('task_updated', task);
    // Notify on completion
    if (status === 'completed') {
      for (const assigneeId of task.assignees) {
        if (assigneeId._id.toString() !== req.user._id.toString()) {
          await createNotification({ recipient: assigneeId._id, sender: req.user._id, type: 'task_completed', title: 'Task Completed', message: `"${task.title}" has been marked as completed`, link: `/tasks/${task._id}`, data: { taskId: task._id } }, io);
        }
      }
    }
    res.json({ success: true, task, message: 'Task status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating task status' });
  }
};

// @desc    Update task position (drag and drop)
// @route   PUT /api/tasks/:id/position
exports.updateTaskPosition = async (req, res) => {
  try {
    const { position, status } = req.body;
    const updates = { position };
    if (status) updates.status = status;
    await Task.findByIdAndUpdate(req.params.id, updates);
    res.json({ success: true, message: 'Position updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating position' });
  }
};

// @desc    Archive/Unarchive task
// @route   PUT /api/tasks/:id/archive
exports.archiveTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.isArchived = !task.isArchived;
    task.archivedAt = task.isArchived ? new Date() : undefined;
    await task.save();
    res.json({ success: true, task, message: `Task ${task.isArchived ? 'archived' : 'restored'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error archiving task' });
  }
};

// @desc    Get archived tasks
// @route   GET /api/tasks/archived
exports.getArchivedTasks = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.query;
    const filter = { isArchived: true };
    if (workspaceId) filter.workspace = workspaceId;
    if (projectId) filter.project = projectId;
    const tasks = await Task.find(filter)
      .populate('creator', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .sort({ archivedAt: -1 });
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching archived tasks' });
  }
};

// @desc    Add attachment to task
// @route   POST /api/tasks/:id/attachments
exports.addAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const isImage = req.file.mimetype.startsWith('image/');
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'taskflow/attachments',
      resource_type: isImage ? 'image' : 'raw',
    });
    const attachment = { url: result.secure_url, filename: req.file.originalname, publicId: result.public_id, fileType: req.file.mimetype, size: req.file.size, uploadedBy: req.user._id };
    task.attachments.push(attachment);
    await task.save();
    res.json({ success: true, attachment: task.attachments[task.attachments.length - 1], message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading attachment' });
  }
};

// @desc    Remove attachment
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
exports.removeAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });
    if (attachment.publicId) await deleteFromCloudinary(attachment.publicId).catch(() => {});
    task.attachments.pull(req.params.attachmentId);
    await task.save();
    res.json({ success: true, message: 'Attachment removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error removing attachment' });
  }
};

// @desc    Export tasks as CSV
// @route   GET /api/tasks/export
exports.exportTasks = async (req, res) => {
  try {
    const { projectId, workspaceId, format = 'csv' } = req.query;
    const filter = { isArchived: false };
    if (projectId) filter.project = projectId;
    if (workspaceId) filter.workspace = workspaceId;
    const tasks = await Task.find(filter)
      .populate('creator', 'name')
      .populate('assignees', 'name')
      .populate('project', 'name');
    if (format === 'csv') {
      const headers = ['Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Assignees', 'Tags', 'Project', 'Created At'];
      const rows = tasks.map(t => [
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.status, t.priority, t.category || '',
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
        `"${(t.assignees || []).map(a => a.name).join(', ')}"`,
        `"${(t.tags || []).join(', ')}"`,
        t.project ? t.project.name : '',
        new Date(t.createdAt).toLocaleDateString(),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
      return res.send(csv);
    }
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error exporting tasks' });
  }
};
