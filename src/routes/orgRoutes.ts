import express from 'express';
import {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  inviteMember,
} from '../controllers/orgController';
import { requireAuth, requireOrgMember } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create organization
router.post('/', createOrganization);

// Get user's organizations
router.get('/my-organizations', getUserOrganizations);

// Get organization details
router.get('/:org_id', getOrganization);

// Invite member (requires founder/steward)
router.post('/:org_id/invite', requireOrgMember, inviteMember);

export default router;