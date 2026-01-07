import express from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addProjectComment,
  getProjectComments,
  updateProjectComment,
  deleteProjectComment,
} from '../controllers/projectController';
import { requireAuth, requireOrgMember, requirePermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create project - requires create_projects permission
router.post('/:band_Id/projects', requireOrgMember, requirePermission('create_projects'), createProject);

// Get projects - requires view permission
router.get('/:band_Id/projects', requireOrgMember, getProjects);

// Get single project - requires view permission
router.get('/:band_Id/projects/:project_id', requireOrgMember, getProject);

// Update project - requires create_projects permission
router.put('/:band_Id/projects/:project_id', requireOrgMember, requirePermission('create_projects'), updateProject);

// Delete project - requires create_projects permission
router.delete('/:band_Id/projects/:project_id', requireOrgMember, requirePermission('create_projects'), deleteProject);

// Comment routes - comment permission required
router.get('/:band_Id/projects/:project_id/comments', requireOrgMember, getProjectComments);
router.post('/:band_Id/projects/:project_id/comments', requireOrgMember, requirePermission('comment'), addProjectComment);
router.put('/:band_Id/projects/:project_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), updateProjectComment);
router.delete('/:band_Id/projects/:project_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), deleteProjectComment);

export default router;