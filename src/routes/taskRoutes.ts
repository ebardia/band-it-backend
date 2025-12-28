import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
} from '../controllers/taskController';
import { requireAuth, requireOrgMember } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create task
router.post('/:band_Id/projects/:project_id/tasks', requireOrgMember, createTask);

// Get project tasks
router.get('/:band_Id/projects/:project_id/tasks', getTasks);

// Get task details
router.get('/:band_Id/projects/:project_id/tasks/:task_id', getTask);

// Update task
router.put('/:band_Id/projects/:project_id/tasks/:task_id', requireOrgMember, updateTask);

// Delete task
router.delete('/:band_Id/projects/:project_id/tasks/:task_id', requireOrgMember, deleteTask);

// Complete task (shortcut)
router.post('/:band_Id/projects/:project_id/tasks/:task_id/complete', requireOrgMember, completeTask);

export default router;
