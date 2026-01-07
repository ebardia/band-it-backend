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
  addProposalComment,
  getProposalComments,
  updateProposalComment,
  deleteProposalComment,
} from '../controllers/proposalController';
import { requireAuth, requireOrgMember, requirePermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Create proposal - requires create_proposals permission
router.post('/:band_Id/proposals', requireOrgMember, requirePermission('create_proposals'), createProposal);

// Get proposals - requires view permission (all active members have this)
router.get('/:band_Id/proposals', requireOrgMember, getProposals);

// Get proposal details - requires view permission
router.get('/:band_Id/proposals/:proposal_id', requireOrgMember, getProposal);

// Submit for review - requires create_proposals permission
router.post('/:band_Id/proposals/:proposal_id/submit', requireOrgMember, requirePermission('create_proposals'), submitProposal);

// Review proposal - requires approve_proposals permission (steward, governor, founder)
router.post('/:band_Id/proposals/:proposal_id/review', requireOrgMember, requirePermission('approve_proposals'), reviewProposal);

// Vote on proposal - requires vote_proposals permission
router.post('/:band_Id/proposals/:proposal_id/vote', requireOrgMember, requirePermission('vote_proposals'), voteOnProposal);

// Finalize proposal - requires approve_proposals permission
router.post('/:band_Id/proposals/:proposal_id/finalize', requireOrgMember, requirePermission('approve_proposals'), finalizeProposal);

// Update proposal - requires approve_proposals permission (admin/testing endpoint)
router.put('/:band_Id/proposals/:proposal_id', requireOrgMember, requirePermission('approve_proposals'), updateProposal);

// Comment routes - comment permission required
router.get('/:band_Id/proposals/:proposal_id/comments', requireOrgMember, getProposalComments);
router.post('/:band_Id/proposals/:proposal_id/comments', requireOrgMember, requirePermission('comment'), addProposalComment);
router.put('/:band_Id/proposals/:proposal_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), updateProposalComment);
router.delete('/:band_Id/proposals/:proposal_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), deleteProposalComment);

export default router;