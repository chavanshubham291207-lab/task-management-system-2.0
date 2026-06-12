const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask: getTaskById,
  createTask,
  updateTask,
  deleteTask,
  duplicateTask,
  updateTaskStatus,
  updateTaskPosition,
  archiveTask,
  getArchivedTasks,
  addAttachment,
  removeAttachment,
  exportTasks,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Apply JWT authentication protection middleware to all task endpoints
router.use(protect);

// Special routes (must come BEFORE /:id to prevent matching "export" or "archived" as "id")
router.get('/export', exportTasks);
router.get('/archived', getArchivedTasks);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/duplicate', duplicateTask);
router.put('/:id/status', updateTaskStatus);
router.put('/:id/position', updateTaskPosition);
router.put('/:id/archive', archiveTask);

router.post('/:id/attachments', uploadSingle, addAttachment);
router.delete('/:id/attachments/:attachmentId', removeAttachment);

module.exports = router;
