import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';

// Upload image
export const uploadBandImage = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId } = req.params;
  const userId = (req as any).user?.userId;
  const { title, description } = req.body;

  if (!req.file) {
    throw new AppError('No file uploaded', ErrorTypes.VALIDATION_ERROR);
  }

  // Check if user is a member
  const member = await prisma.member.findFirst({
    where: {
      bandId,
      userId,
      status: 'active',
    },
  });

  if (!member) {
    throw new AppError('Not a member of this band', ErrorTypes.FORBIDDEN);
  }

  // Get current max order
  const maxOrder = await prisma.bandImage.findFirst({
    where: { bandId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const imageUrl = `/uploads/images/${req.file.filename}`;

  const image = await prisma.bandImage.create({
    data: {
      bandId,
      title,
      description,
      imageUrl,
      order: (maxOrder?.order || 0) + 1,
      uploadedBy: member.id,
    },
  });

  res.json({
    success: true,
    data: { image },
  });
});

// Get band images
export const getBandImages = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId } = req.params;

  const images = await prisma.bandImage.findMany({
    where: { bandId },
    orderBy: { order: 'asc' },
    include: {
      uploader: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    data: { images },
  });
});

// Delete image
export const deleteBandImage = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId, imageId } = req.params;
  const userId = (req as any).user?.userId;

  const member = await prisma.member.findFirst({
    where: {
      bandId,
      userId,
      status: 'active',
    },
  });

  if (!member) {
    throw new AppError('Not a member of this band', ErrorTypes.FORBIDDEN);
  }

  await prisma.bandImage.delete({
    where: { id: imageId },
  });

  res.json({
    success: true,
    message: 'Image deleted',
  });
});

// Upload document
export const uploadBandDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId } = req.params;
  const userId = (req as any).user?.userId;
  const { title, description } = req.body;

  if (!req.file) {
    throw new AppError('No file uploaded', ErrorTypes.VALIDATION_ERROR);
  }

  const member = await prisma.member.findFirst({
    where: {
      bandId,
      userId,
      status: 'active',
    },
  });

  if (!member) {
    throw new AppError('Not a member of this band', ErrorTypes.FORBIDDEN);
  }

  const fileUrl = `/uploads/documents/${req.file.filename}`;

  const document = await prisma.bandDocument.create({
    data: {
      bandId,
      title,
      description,
      fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: member.id,
    },
  });

  res.json({
    success: true,
    data: { document },
  });
});

// Get band documents
export const getBandDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId } = req.params;

  const documents = await prisma.bandDocument.findMany({
    where: { bandId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    data: { documents },
  });
});

// Delete document
export const deleteBandDocument = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId, documentId } = req.params;
  const userId = (req as any).user?.userId;

  const member = await prisma.member.findFirst({
    where: {
      bandId,
      userId,
      status: 'active',
    },
  });

  if (!member) {
    throw new AppError('Not a member of this band', ErrorTypes.FORBIDDEN);
  }

  await prisma.bandDocument.delete({
    where: { id: documentId },
  });

  res.json({
    success: true,
    message: 'Document deleted',
  });
});