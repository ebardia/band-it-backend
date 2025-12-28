import express from 'express';
import {
  uploadBandImage,
  getBandImages,
  deleteBandImage,
  uploadBandDocument,
  getBandDocuments,
  deleteBandDocument,
} from '../controllers/uploadController';
import { requireAuth } from '../middleware/auth';
import { uploadImage, uploadDocument } from '../config/upload';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Images
router.post('/:id/images', uploadImage.single('image'), uploadBandImage);
router.get('/:id/images', getBandImages);
router.delete('/:id/images/:imageId', deleteBandImage);

// Documents
router.post('/:id/documents', uploadDocument.single('document'), uploadBandDocument);
router.get('/:id/documents', getBandDocuments);
router.delete('/:id/documents/:documentId', deleteBandDocument);

export default router;