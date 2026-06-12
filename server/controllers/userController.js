const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get user profile
// @route   GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, jobRole } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();
    if (jobRole !== undefined) updates.jobRole = jobRole.trim();
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server error updating profile' });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const user = await User.findById(req.user._id);
    // Delete old avatar from Cloudinary
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId).catch(() => {});
    }
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'taskflow/avatars',
      transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
    });
    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, avatar: result.secure_url, message: 'Avatar uploaded successfully' });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: 'Error uploading avatar' });
  }
};

// @desc    Search users by name or email
// @route   GET /api/users/search?q=query
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, users: [] });
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
    }).select('name email avatar jobRole').limit(10);
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error searching users' });
  }
};

// @desc    Get user notifications
// @route   GET /api/users/notifications
exports.getNotifications = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
exports.markNotificationRead = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
