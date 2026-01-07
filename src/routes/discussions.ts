import express from 'express';
import {
  createDiscussion,
  getDiscussions,
  getDiscussion,
  updateDiscussion,
  deleteDiscussion,
  addComment,
  updateComment,
  deleteComment,
} from '../controllers/discussionController';
import { requireAuth, requireOrgMember, requirePermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Discussion routes
router.post('/:band_Id/discussions', requireOrgMember, requirePermission('comment'), createDiscussion);
router.get('/:band_Id/discussions', requireOrgMember, getDiscussions);
router.get('/:band_Id/discussions/:discussion_id', requireOrgMember, getDiscussion);
router.put('/:band_Id/discussions/:discussion_id', requireOrgMember, requirePermission('comment'), updateDiscussion);
router.delete('/:band_Id/discussions/:discussion_id', requireOrgMember, requirePermission('comment'), deleteDiscussion);

// Comment routes - comment permission required
router.post('/:band_Id/discussions/:discussion_id/comments', requireOrgMember, requirePermission('comment'), addComment);
router.put('/:band_Id/discussions/:discussion_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), updateComment);
router.delete('/:band_Id/discussions/:discussion_id/comments/:comment_id', requireOrgMember, requirePermission('comment'), deleteComment);

export default router;