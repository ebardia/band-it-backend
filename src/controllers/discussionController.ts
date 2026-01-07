import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';

// Create discussion
export const createDiscussion = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;
  const { title, body } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  if (!title || !body) {
    throw new AppError('Title and body are required', ErrorTypes.VALIDATION_ERROR);
  }

  const discussion = await prisma.discussion.create({
    data: {
      bandId: band_Id,
      title,
      body,
      createdBy: req.member.id,
    },
    include: {
      creator: {
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

  res.status(201).json({
    success: true,
    data: { discussion },
  });
});

// Get all discussions for a band
export const getDiscussions = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;

  const discussions = await prisma.discussion.findMany({
    where: { bandId: band_Id },
    include: {
      creator: {
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
    orderBy: { lastActivityAt: 'desc' },
  });

  res.json({
    success: true,
    data: { discussions },
  });
});

// Get single discussion with comments
export const getDiscussion = asyncHandler(async (req: Request, res: Response) => {
  const { discussion_id } = req.params;

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussion_id },
    include: {
      creator: {
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
      comments: {
        where: { parentCommentId: null }, // Only top-level comments
        include: {
          creator: {
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
          replies: {
            include: {
              creator: {
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
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!discussion) {
    throw new AppError('Discussion not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  res.json({
    success: true,
    data: { discussion },
  });
});

// Update discussion
export const updateDiscussion = asyncHandler(async (req: Request, res: Response) => {
  const { discussion_id } = req.params;
  const { title, body } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussion_id },
  });

  if (!discussion) {
    throw new AppError('Discussion not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (discussion.createdBy !== req.member.id) {
    throw new AppError('Not authorized to edit this discussion', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const updated = await prisma.discussion.update({
    where: { id: discussion_id },
    data: { title, body },
    include: {
      creator: {
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
    data: { discussion: updated },
  });
});

// Delete discussion
export const deleteDiscussion = asyncHandler(async (req: Request, res: Response) => {
  const { discussion_id } = req.params;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussion_id },
  });

  if (!discussion) {
    throw new AppError('Discussion not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (discussion.createdBy !== req.member.id) {
    throw new AppError('Not authorized to delete this discussion', ErrorTypes.AUTHORIZATION_ERROR);
  }

  await prisma.discussion.delete({
    where: { id: discussion_id },
  });

  res.json({
    success: true,
    data: { message: 'Discussion deleted' },
  });
});

// Add comment to discussion
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { discussion_id } = req.params;
  const { body, parentCommentId } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  if (!body) {
    throw new AppError('Comment body is required', ErrorTypes.VALIDATION_ERROR);
  }

  const comment = await prisma.comment.create({
    data: {
      discussionId: discussion_id,
      body,
      parentCommentId: parentCommentId || null,
      createdBy: req.member.id,
    },
    include: {
      creator: {
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

  // Update discussion reply count and last activity
  await prisma.discussion.update({
    where: { id: discussion_id },
    data: {
      replyCount: { increment: 1 },
      lastActivityAt: new Date(),
    },
  });

  res.status(201).json({
    success: true,
    data: { comment },
  });
});

// Update comment
export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const { comment_id } = req.params;
  const { body } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: comment_id },
  });

  if (!comment) {
    throw new AppError('Comment not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (comment.createdBy !== req.member.id) {
    throw new AppError('Not authorized to edit this comment', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const updated = await prisma.comment.update({
    where: { id: comment_id },
    data: { body },
    include: {
      creator: {
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
    data: { comment: updated },
  });
});

// Delete comment
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const { comment_id } = req.params;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: comment_id },
  });

  if (!comment) {
    throw new AppError('Comment not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (comment.createdBy !== req.member.id) {
    throw new AppError('Not authorized to delete this comment', ErrorTypes.AUTHORIZATION_ERROR);
  }

  // Update discussion reply count
  if (comment.discussionId) {
    await prisma.discussion.update({
      where: { id: comment.discussionId },
      data: { replyCount: { decrement: 1 } },
    });
  }

  await prisma.comment.delete({
    where: { id: comment_id },
  });

  res.json({
    success: true,
    data: { message: 'Comment deleted' },
  });
});