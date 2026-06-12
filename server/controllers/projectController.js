const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

// @desc    Create project
// @route   POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const { name, description, workspaceId, deadline, color, priority, members } = req.body;
    if (!name || !workspaceId) return res.status(400).json({ success: false, message: 'Project name and workspace are required' });
    const project = await Project.create({
      name, description, color: color || '#7c3aed', deadline, priority,
      workspace: workspaceId, owner: req.user._id,
      members: members || [req.user._id],
    });
    await ActivityLog.create({ user: req.user._id, workspace: workspaceId, project: project._id, action: 'project_created', description: `Created project "${name}"` });
    await project.populate(['owner', 'members']);
    res.status(201).json({ success: true, project, message: 'Project created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error creating project' });
  }
};

// @desc    Get all projects for workspace
// @route   GET /api/projects?workspaceId=xxx
exports.getProjects = async (req, res) => {
  try {
    const { workspaceId, status, archived } = req.query;
    const filter = {};
    if (workspaceId) filter.workspace = workspaceId;
    if (status) filter.status = status;
    filter.isArchived = archived === 'true';
    const projects = await Project.find(filter)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
    // Add task counts
    const projectsWithCounts = await Promise.all(projects.map(async (proj) => {
      const taskCount = await Task.countDocuments({ project: proj._id, isArchived: false });
      const completedCount = await Task.countDocuments({ project: proj._id, status: 'completed', isArchived: false });
      return { ...proj.toObject(), taskCount, completedCount };
    }));
    res.json({ success: true, projects: projectsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching projects' });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const taskCount = await Task.countDocuments({ project: project._id, isArchived: false });
    const completedCount = await Task.countDocuments({ project: project._id, status: 'completed', isArchived: false });
    res.json({ success: true, project: { ...project.toObject(), taskCount, completedCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching project' });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const { name, description, status, color, deadline, priority, members } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (color) updates.color = color;
    if (deadline !== undefined) updates.deadline = deadline;
    if (priority) updates.priority = priority;
    if (members) updates.members = members;
    const updated = await Project.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');
    await ActivityLog.create({ user: req.user._id, workspace: project.workspace, project: project._id, action: 'project_updated', description: `Updated project "${project.name}"` });
    res.json({ success: true, project: updated, message: 'Project updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating project' });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    await ActivityLog.create({ user: req.user._id, workspace: project.workspace, action: 'project_deleted', description: `Deleted project "${project.name}"` });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting project' });
  }
};

// @desc    Archive/Unarchive project
// @route   PUT /api/projects/:id/archive
exports.archiveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    project.isArchived = !project.isArchived;
    project.archivedAt = project.isArchived ? new Date() : undefined;
    if (project.isArchived) project.status = 'archived';
    await project.save();
    res.json({ success: true, project, message: `Project ${project.isArchived ? 'archived' : 'restored'} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error archiving project' });
  }
};

// @desc    Get project stats
// @route   GET /api/projects/:id/stats
exports.getProjectStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { project: require('mongoose').Types.ObjectId.createFromHexString(req.params.id), isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const result = { pending: 0, 'in-progress': 0, review: 0, completed: 0 };
    stats.forEach(s => { result[s._id] = s.count; });
    res.json({ success: true, stats: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching project stats' });
  }
};
