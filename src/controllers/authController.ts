import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import emailService from '../services/emailService';

// Register new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { 
    email, 
    password, 
    firstName, 
    lastName,
    // New optional profile fields
    displayName,
    bio,
    location,
    timezone,
    skills,
    passions,
    wantsToLearn,
    hoursPerWeek,
    remoteOnly,
    profileVisibility
  } = req.body;

  // Validate required fields
  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Email, password, first name, and last name are required', ErrorTypes.VALIDATION_ERROR);
  }

  if (password.length < 8) {
    throw new AppError(
      'Password must be at least 8 characters',
      ErrorTypes.VALIDATION_ERROR
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError('Email already registered', ErrorTypes.CONFLICT_ERROR);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with profile
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      displayName: displayName || null,
      bio: bio || null,
      location: location || null,
      timezone: timezone || null,
      skills: skills || [],
      passions: passions || [],
      wantsToLearn: wantsToLearn || [],
      hoursPerWeek: hoursPerWeek || null,
      remoteOnly: remoteOnly || false,
      profileVisibility: profileVisibility || 'public',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      bio: true,
      location: true,
      timezone: true,
      skills: true,
      passions: true,
      wantsToLearn: true,
      hoursPerWeek: true,
      remoteOnly: true,
      profileVisibility: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
  });

  // Send welcome email (async, don't wait)
  emailService.sendWelcomeEmail(user.email, user.firstName).catch((err) => {
    console.error('Failed to send welcome email:', err);
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});


// Login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new AppError('Email and password are required', ErrorTypes.VALIDATION_ERROR);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      password: true,  // Need this for password verification
      firstName: true,
      lastName: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      location: true,
      timezone: true,
      skills: true,
      passions: true,
      wantsToLearn: true,
      hoursPerWeek: true,
      remoteOnly: true,
      profileVisibility: true,
      socialLinks: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', ErrorTypes.AUTHENTICATION_ERROR);
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', ErrorTypes.AUTHENTICATION_ERROR);
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        location: user.location,
        timezone: user.timezone,
        skills: user.skills,
        passions: user.passions,
        wantsToLearn: user.wantsToLearn,
        hoursPerWeek: user.hoursPerWeek,
        remoteOnly: user.remoteOnly,
        profileVisibility: user.profileVisibility,
        socialLinks: user.socialLinks,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
  });
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', ErrorTypes.VALIDATION_ERROR);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success (security: don't reveal if email exists)
  if (!user) {
    res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
    });
    return;
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Save token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // Send reset email
  await emailService.sendPasswordResetEmail(
    user.email,
    user.firstName,
    resetToken
  );

  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent',
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Token and new password are required', ErrorTypes.VALIDATION_ERROR);
  }

  if (newPassword.length < 8) {
    throw new AppError(
      'Password must be at least 8 characters',
      ErrorTypes.VALIDATION_ERROR
    );
  }

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', ErrorTypes.AUTHENTICATION_ERROR);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

// Get current user
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', ErrorTypes.AUTHENTICATION_ERROR);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  res.json({
    success: true,
    data: { user },
  });
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError('Refresh token required', ErrorTypes.VALIDATION_ERROR);
  }

  // Verify refresh token (will throw if invalid)
  const { verifyRefreshToken } = require('../utils/jwt');
  const payload = verifyRefreshToken(token);

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
  });

  res.json({
    success: true,
    data: { accessToken },
  });
});
