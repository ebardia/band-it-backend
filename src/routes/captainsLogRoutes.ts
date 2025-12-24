import { Router } from 'express';
import { requireAuth, requireOrgMember } from '../middleware/auth';
import { getCaptainsLog, getCaptainsLogEntry } from '../controllers/captainsLogController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get Captain's Log entries for organization
router.get('/:org_id/captains-log', requireOrgMember, getCaptainsLog);

// Get specific entry
router.get('/:org_id/captains-log/:entry_id', requireOrgMember, getCaptainsLogEntry);

export default router;