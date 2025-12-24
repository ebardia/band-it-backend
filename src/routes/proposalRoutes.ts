import express from 'express';
import {
  createProposal,
  getProposals,
  getProposal,
  submitProposal,
  reviewProposal,
  voteOnProposal,
  finalizeProposal,
  updateProposal,
} from '../controllers/proposalController';
import { requireAuth, requireOrgMember } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create proposal (must be org member)
router.post('/:org_id/proposals', requireOrgMember, createProposal);

// Get org proposals
router.get('/:org_id/proposals', getProposals);

// Get proposal details
router.get('/:org_id/proposals/:proposal_id', getProposal);

// Submit for review
router.post('/:org_id/proposals/:proposal_id/submit', requireOrgMember, submitProposal);

// Review proposal (steward only - checked in controller)
router.post('/:org_id/proposals/:proposal_id/review', requireOrgMember, reviewProposal);

// Vote on proposal
router.post('/:org_id/proposals/:proposal_id/vote', requireOrgMember, voteOnProposal);

// Finalize proposal (check results)
router.post('/:org_id/proposals/:proposal_id/finalize', requireOrgMember, finalizeProposal);

// Update proposal (admin/testing)
router.put('/:org_id/proposals/:proposal_id', requireOrgMember, updateProposal);

export default router;