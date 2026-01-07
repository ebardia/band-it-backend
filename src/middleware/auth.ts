import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorTypes, asyncHandler } from './errorHandler';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { hasPermission, Permission, Role, isValidRole } from '../utils/permissions';

// Require authentication
export const requireAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', ErrorTypes.AUTHENTICATION_ERROR);
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const payload = verifyAccessToken(token);
      
      // Check if user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new AppError('User no longer exists', ErrorTypes.AUTHENTICATION_ERROR);
      }

      // Attach user to request
      req.user = {
        userId: user.id,
        email: user.email,
      };

      next();
    } catch (error) {
      throw new AppError('Invalid or expired token', ErrorTypes.AUTHENTICATION_ERROR);
    }
  }
);

// Require specific role (legacy - kept for backward compatibility)
export const requireRole = (...roles: string[]) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.member) {
        throw new AppError('Member context required', ErrorTypes.AUTHORIZATION_ERROR);
      }

      if (!roles.includes(req.member.role)) {
        throw new AppError(
          `Requires one of: ${roles.join(', ')}`,
          ErrorTypes.AUTHORIZATION_ERROR
        );
      }

      next();
    }
  );
};

// NEW: Require specific permission (recommended for new code)
export const requirePermission = (...permissions: Permission[]) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.member) {
        throw new AppError('Member context required', ErrorTypes.AUTHORIZATION_ERROR);
      }

      // Validate role
      if (!isValidRole(req.member.role)) {
        throw new AppError('Invalid member role', ErrorTypes.AUTHORIZATION_ERROR);
      }

      // Check if member has ANY of the required permissions
      const hasAnyPermission = permissions.some(permission => 
        hasPermission(req.member.role as Role, permission)
      );

      if (!hasAnyPermission) {
        throw new AppError(
          `Requires one of: ${permissions.join(', ')}`,
          ErrorTypes.AUTHORIZATION_ERROR
        );
      }

      next();
    }
  );
};

// NEW: Require ALL specified permissions
export const requireAllPermissions = (...permissions: Permission[]) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.member) {
        throw new AppError('Member context required', ErrorTypes.AUTHORIZATION_ERROR);
      }

      // Validate role
      if (!isValidRole(req.member.role)) {
        throw new AppError('Invalid member role', ErrorTypes.AUTHORIZATION_ERROR);
      }

      // Check if member has ALL required permissions
      const hasAllPermissions = permissions.every(permission => 
        hasPermission(req.member.role as Role, permission)
      );

      if (!hasAllPermissions) {
        throw new AppError(
          `Missing required permissions: ${permissions.join(', ')}`,
          ErrorTypes.AUTHORIZATION_ERROR
        );
      }

      next();
    }
  );
};

// Require Band membership (loads member context)
export const requireOrgMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError('Authentication required', ErrorTypes.AUTHENTICATION_ERROR);
  }

  const bandId = req.params.band_Id;
  if (!bandId) {
    throw new AppError('Band ID required', ErrorTypes.VALIDATION_ERROR);
  }

  const member = await prisma.member.findFirst({
    where: {
      bandId,
      userId: req.user.userId,
      status: 'active',
    },
  });

  if (!member) {
    throw new AppError('Not a member of this Band', ErrorTypes.AUTHORIZATION_ERROR);
  }

  // Validate that member has a valid role
  if (!isValidRole(member.role)) {
    throw new AppError(
      `Invalid member role: ${member.role}. Please contact an administrator.`,
      ErrorTypes.AUTHORIZATION_ERROR
    );
  }

  req.member = member;
  next();
});

// NEW: Convenience middleware - require membership AND specific permission
export const requireMemberWithPermission = (...permissions: Permission[]) => {
  return [requireOrgMember, requirePermission(...permissions)];
};

// NEW: Convenience middleware - require membership AND all permissions
export const requireMemberWithAllPermissions = (...permissions: Permission[]) => {
  return [requireOrgMember, requireAllPermissions(...permissions)];
};