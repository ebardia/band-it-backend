import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
  addTaskComment,
  getTaskComments,
  updateTaskComment,
  deleteTaskComment,
} from '../controllers/taskController';
import { requireAuth, requireOrgMember, requirePermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create task - requires create_tasks permission
router.post('/:band_Id/projects/:project_id/tasks', requireOrgMember, requirePermission('create_tasks'), createTask);

// Get tasks - requires view permission
router.get('/:band_Id/projects/:project_id/tasks', requireOrgMember, getTasks);

// Get single task - requires view permission
router.get('/:band_Id/projects/:project_id/tasks/:task_id', requireOrgMember, getTask);

// Update task - requires create_tasks permission
router.put('/:band_Id/projects/:project_id/tasks/:task_id', requireOrgMember, requirePermission('create_tasks'), updateTask);

// Complete task - requires take_tasks permission (anyone who can work on tasks)
router.post('/:band_Id/projects/:project_id/tasks/:task_id/complete', requireOrgMember, requirePermission('take_tasks'), completeTask);

// Delete task - requires create_tasks permission
router.delete('/:band_Id/projects/:project_id/tasks/:task_id', requireOrgMember, requirePermission('create_tasks'), deleteTask);

// Comment routes - comment permission required
router.get('/:band_Id/projects/:project_id/tasks/:task_id/comments', requireOrgMember, getTaskComments);
router.post('/:band_Id/projects/:project_id/tasks/:task_id/comments', requireOrgMember, requirePermission('comment'), addTaskComment);
router.put('/:band_Id/projects/:project_id/tasks/:task_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), updateTaskComment);
router.delete('/:band_Id/projects/:project_id/tasks/:task_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), deleteTaskComment);

export default router;