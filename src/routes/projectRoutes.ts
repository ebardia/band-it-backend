import express from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';
import { requireAuth, requireOrgMember } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create project
router.post('/:org_id/projects', requireOrgMember, createProject);

// Get org projects
router.get('/:org_id/projects', getProjects);

// Get project details
router.get('/:org_id/projects/:project_id', getProject);

// Update project
router.put('/:org_id/projects/:project_id', requireOrgMember, updateProject);

// Delete project
router.delete('/:org_id/projects/:project_id', requireOrgMember, deleteProject);

export default router;