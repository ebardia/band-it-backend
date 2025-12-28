import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  refreshToken,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', requireAuth, getCurrentUser);

export default router;
