const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  joinWorkspace,
  getMembers,
  removeMember,
  updateMemberRole,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

// Join workspace doesn't require protect header if they authenticate on join page,
// but controller requires req.user._id, so it should be protected!
router.use(protect);

router.route('/')
  .post(createWorkspace)
  .get(getWorkspaces);

router.post('/join/:token', joinWorkspace);

router.route('/:id')
  .get(getWorkspace)
  .put(updateWorkspace)
  .delete(deleteWorkspace);

router.route('/:id/invite')
  .post(inviteMember);

router.route('/:id/members')
  .get(getMembers);

router.route('/:id/members/:userId')
  .delete(removeMember);

router.route('/:id/members/:userId/role')
  .put(updateMemberRole);

module.exports = router;
