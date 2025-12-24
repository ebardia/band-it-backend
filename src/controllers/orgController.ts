import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';
import { generateInviteToken } from '../utils/password';

// Create organization
export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    slug,
    description,
    city,
    stateProvince,
    postalCode,
    country,
    isPublic,
    shortDescription,
    tags,
  } = req.body;

  if (!req.user) {
    throw new AppError('Authentication required', ErrorTypes.AUTHENTICATION_ERROR);
  }

  // Validate required fields
  if (!name || !slug || !city || !stateProvince || !postalCode || !country) {
    throw new AppError('Missing required fields', ErrorTypes.VALIDATION_ERROR);
  }

  // Check if slug is taken
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError('Organization slug already taken', ErrorTypes.CONFLICT_ERROR);
  }

  // Create org and founder member in transaction
  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name,
        slug,
        description,
        city,
        stateProvince,
        postalCode,
        country,
        isPublic: isPublic || false,
        shortDescription,
        tags: tags || [],
        memberCount: 1,
      },
    });

    // Create founder member
    await tx.member.create({
      data: {
        orgId: newOrg.id,
        userId: req.user!.userId,
        role: 'founder',
        status: 'active',
        joinedAt: new Date(),
        founderExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return newOrg;
  });

  res.status(201).json({
    success: true,
    data: { organization: org },
  });
});

// Get user's organizations
export const getUserOrganizations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', ErrorTypes.AUTHENTICATION_ERROR);
  }

  const memberships = await prisma.member.findMany({
    where: {
      userId: req.user.userId,
      status: 'active',
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          city: true,
          stateProvince: true,
          country: true,
          isPublic: true,
          tags: true,
          memberCount: true,
          treasuryBalance: true,
          createdAt: true,
        },
      },
    },
  });

  const organizations = memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  res.json({
    success: true,
    data: { organizations },
  });
});

// Get organization details
export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { org_id } = req.params;

  const org = await prisma.organization.findUnique({
    where: { id: org_id },
    include: {
      members: {
        where: { status: 'active' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!org) {
    throw new AppError('Organization not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  res.json({
    success: true,
    data: { organization: org },
  });
});

// Invite member
export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const { org_id } = req.params;
  const { email, role } = req.body;

  if (!req.member || !['founder', 'steward'].includes(req.member.role)) {
    throw new AppError('Only founders/stewards can invite', ErrorTypes.AUTHORIZATION_ERROR);
  }

  // Check if already a member
  const existing = await prisma.member.findFirst({
    where: { orgId: org_id, user: { email } },
  });

  if (existing) {
    throw new AppError('User is already a member', ErrorTypes.CONFLICT_ERROR);
  }

  // Create pending member with invite token
  const inviteToken = generateInviteToken();
  const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const member = await prisma.member.create({
    data: {
      orgId: org_id,
      userId: null, // Will link when they accept
      email,
      role: role || 'working',
      status: 'pending',
      inviteToken,
      inviteTokenExpiry,
      invitedBy: req.member.id,
    },
  });

  // TODO: Send invitation email

  res.status(201).json({
    success: true,
    data: { member, inviteUrl: `${process.env.FRONTEND_URL}/invite/${inviteToken}` },
  });
});