import express from 'express';
import {
  createOrganization,
  getUserbands,
  getOrganization,
  inviteMember,
  updateBandProfile
} from '../controllers/orgController';
import { requireAuth, requireOrgMember } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create Band
router.post('/', createOrganization);

// Get user's bands
router.get('/my-bands', getUserbands);

router.put('/:id/profile', updateBandProfile);

// Get Band details
router.get('/:id', getOrganization);

// Invite member (requires founder/steward)
router.post('/:id/invite', requireOrgMember, inviteMember);

export default router;
