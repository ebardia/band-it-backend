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
router.post('/:band_Id/projects', requireOrgMember, createProject);

// Get org projects
router.get('/:band_Id/projects', getProjects);

// Get project details
router.get('/:band_Id/projects/:project_id', getProject);

// Update project
router.put('/:band_Id/projects/:project_id', requireOrgMember, updateProject);

// Delete project
router.delete('/:band_Id/projects/:project_id', requireOrgMember, deleteProject);

export default router;
