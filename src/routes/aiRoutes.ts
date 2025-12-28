import express from 'express';
import { generateProposal, getBandAiUsage, generateProfile } from '../controllers/aiController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All AI routes require authentication
router.use(requireAuth);

// Generate proposal with AI
router.post('/generate-proposal', generateProposal);

// Generate band profile with AI
router.post('/generate-profile', generateProfile);

// Get band AI usage stats
router.get('/bands/:id/usage', getBandAiUsage);

export default router;