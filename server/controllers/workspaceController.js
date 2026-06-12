const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { workspaceInviteEmail } = require('../utils/emailTemplates');

// @desc    Create workspace
// @route   POST /api/workspaces
exports.createWorkspace = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Workspace name is required' });
    const workspace = await Workspace.create({
      name, description, color: color || '#7c3aed',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });
    await workspace.populate('members.user', 'name email avatar');
    res.status(201).json({ success: true, workspace, message: 'Workspace created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error creating workspace' });
  }
};

// @desc    Get all workspaces for current user
// @route   GET /api/workspaces
exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, workspaces });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching workspaces' });
  }
};

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
exports.getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar jobRole');
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    const isMember = workspace.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, workspace });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
exports.updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || !['owner', 'admin'].includes(member.role)) return res.status(403).json({ success: false, message: 'Not authorized to update workspace' });
    const { name, description, color } = req.body;
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (color) workspace.color = color;
    await workspace.save();
    res.json({ success: true, workspace, message: 'Workspace updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating workspace' });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only the workspace owner can delete it' });
    const projects = await Project.find({ workspace: workspace._id });
    const projectIds = projects.map(p => p._id);
    await Task.deleteMany({ project: { $in: projectIds } });
    await Project.deleteMany({ workspace: workspace._id });
    await workspace.deleteOne();
    res.json({ success: true, message: 'Workspace and all related data deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting workspace' });
  }
};

// @desc    Invite member to workspace
// @route   POST /api/workspaces/:id/invite
exports.inviteMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const workspace = await Workspace.findById(req.params.id).populate('members.user', 'name email');
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    const inviterMember = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    if (!inviterMember || !['owner', 'admin'].includes(inviterMember.role)) return res.status(403).json({ success: false, message: 'Not authorized to invite members' });
    const alreadyMember = workspace.members.some(m => m.user.email === email);
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });
    // Generate invite token
    const inviteToken = crypto.randomBytes(20).toString('hex');
    workspace.inviteToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
    workspace.inviteTokenExpire = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
    await workspace.save();
    const inviteUrl = `${process.env.CLIENT_URL}/workspace/join/${inviteToken}`;
    await sendEmail({ to: email, subject: `You're invited to ${workspace.name} on TaskFlow Pro`, html: workspaceInviteEmail(req.user.name, workspace.name, inviteUrl) });
    res.json({ success: true, message: `Invitation sent to ${email}`, inviteToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error sending invitation' });
  }
};

// @desc    Join workspace via invite token
// @route   POST /api/workspaces/join/:token
exports.joinWorkspace = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const workspace = await Workspace.findOne({ inviteToken: hashedToken, inviteTokenExpire: { $gt: Date.now() } });
    if (!workspace) return res.status(400).json({ success: false, message: 'Invalid or expired invite link' });
    const alreadyMember = workspace.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'You are already a member of this workspace' });
    workspace.members.push({ user: req.user._id, role: 'member' });
    workspace.inviteToken = undefined;
    workspace.inviteTokenExpire = undefined;
    await workspace.save();
    await workspace.populate('members.user', 'name email avatar');
    res.json({ success: true, workspace, message: `Successfully joined ${workspace.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error joining workspace' });
  }
};

// @desc    Get workspace members
// @route   GET /api/workspaces/:id/members
exports.getMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id).populate('members.user', 'name email avatar jobRole lastActive');
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    res.json({ success: true, members: workspace.members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching members' });
  }
};

// @desc    Remove member
// @route   DELETE /api/workspaces/:id/members/:userId
exports.removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    const requesterMember = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requesterMember || !['owner', 'admin'].includes(requesterMember.role)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (workspace.owner.toString() === req.params.userId) return res.status(400).json({ success: false, message: 'Cannot remove the workspace owner' });
    workspace.members = workspace.members.filter(m => m.user.toString() !== req.params.userId);
    await workspace.save();
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error removing member' });
  }
};

// @desc    Update member role
// @route   PUT /api/workspaces/:id/members/:userId/role
exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only the owner can change roles' });
    const member = workspace.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    member.role = role;
    await workspace.save();
    res.json({ success: true, message: 'Member role updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating role' });
  }
};
