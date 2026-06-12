const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  searchUsers,
  getNotifications,
  markNotificationRead,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar: avatarUploadMiddleware } = require('../middleware/upload');

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.post('/upload-avatar', avatarUploadMiddleware, uploadAvatar);
router.get('/search', searchUsers);

router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
