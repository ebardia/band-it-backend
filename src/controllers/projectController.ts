import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';
import { log } from '../utils/captainsLog';

// Create project (from approved proposal)
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;
  const {
    proposalId,
    name,
    description,
    startDate,
    targetDate,
  } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  if (!name || !proposalId) {
    throw new AppError('Name and proposalId are required', ErrorTypes.VALIDATION_ERROR);
  }

  // Verify proposal is approved
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal || proposal.state !== 'approved') {
    throw new AppError('Proposal must be approved to create project', ErrorTypes.VALIDATION_ERROR);
  }

  const project = await prisma.project.create({
    data: {
      bandId: band_Id,
      proposalId,
      name,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      createdBy: req.member.id,
      status: 'planning',
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
      proposal: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // LOG ACTIVITY
  await log.projectCreated(
    band_Id,
    req.member.id,
    project.id,
    project.name,
    proposal.title
  );

  res.status(201).json({
    success: true,
    data: { project },
  });
});

// Get Band projects
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;
  const { status, proposalId } = req.query;

  const where: any = { bandId: band_Id };
  
  if (status) where.status = status;
  if (proposalId) where.proposalId = proposalId;

  const projects = await prisma.project.findMany({
    where,
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
      proposal: {
        select: {
          id: true,
          title: true,
        },
      },
      tasks: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate progress for each project
  const projectsWithProgress = projects.map((p) => ({
    ...p,
    totalTasks: p.tasks.length,
    completedTasks: p.tasks.filter((t) => t.status === 'completed').length,
    progressPercentage: p.tasks.length > 0 
      ? Math.round((p.tasks.filter((t) => t.status === 'completed').length / p.tasks.length) * 100)
      : 0,
  }));

  res.json({
    success: true,
    data: { projects: projectsWithProgress },
  });
});

// Get single project
export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: project_id },
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
      proposal: true,
      tasks: {
        include: {
          assignee: {
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
  });

  if (!project) {
    throw new AppError('Project not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // Calculate progress
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === 'completed').length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  res.json({
    success: true,
    data: { 
      project: {
        ...project,
        totalTasks,
        completedTasks,
        progressPercentage,
      },
    },
  });
});

// Update project
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id, project_id } = req.params;
  const { name, description, status, startDate, targetDate } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const project = await prisma.project.findUnique({ where: { id: project_id } });
  
  if (!project) {
    throw new AppError('Project not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // Track changes for logging
  const changes: any = {};
  if (name !== undefined && name !== project.name) {
    changes.name = { from: project.name, to: name };
  }
  if (description !== undefined && description !== project.description) {
    changes.description = { from: project.description, to: description };
  }
  if (status !== undefined && status !== project.status) {
    changes.status = { from: project.status, to: status };
  }
  if (startDate !== undefined) {
    const oldDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : 'none';
    const newDate = startDate ? new Date(startDate).toLocaleDateString() : 'none';
    if (oldDate !== newDate) {
      changes.startDate = { from: oldDate, to: newDate };
    }
  }
  if (targetDate !== undefined) {
    const oldDate = project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'none';
    const newDate = targetDate ? new Date(targetDate).toLocaleDateString() : 'none';
    if (oldDate !== newDate) {
      changes.targetDate = { from: oldDate, to: newDate };
    }
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'completed') {
      updates.completedAt = new Date();
    }
  }
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
  if (targetDate !== undefined) updates.targetDate = targetDate ? new Date(targetDate) : null;

  const updated = await prisma.project.update({
    where: { id: project_id },
    data: updates,
  });

  // LOG ACTIVITY (only if there were actual changes)
  if (Object.keys(changes).length > 0) {
    await log.projectUpdated(
      band_Id,
      req.member.id,
      project_id,
      updated.name,
      changes
    );
  }

  res.json({
    success: true,
    data: { project: updated },
  });
});

// Delete project
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id, project_id } = req.params;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const project = await prisma.project.findUnique({ where: { id: project_id } });
  
  if (!project) {
    throw new AppError('Project not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // LOG ACTIVITY (before deletion)
  await log.projectDeleted(
    band_Id,
    req.member.id,
    project_id,
    project.name
  );

  await prisma.project.delete({ where: { id: project_id } });

  res.json({
    success: true,
    data: { message: 'Project deleted' },
  });
});

// Add comment to project
export const addProjectComment = asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.params;
  const { body, parentCommentId } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  if (!body) {
    throw new AppError('Comment body is required', ErrorTypes.VALIDATION_ERROR);
  }

  const comment = await prisma.comment.create({
    data: {
      projectId: project_id,
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

  res.status(201).json({
    success: true,
    data: { comment },
  });
});

// Get project comments
export const getProjectComments = asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.params;

  const comments = await prisma.comment.findMany({
    where: { 
      projectId: project_id,
      parentCommentId: null, // Only top-level comments
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
  });

  res.json({
    success: true,
    data: { comments },
  });
});

// Update comment
export const updateProjectComment = asyncHandler(async (req: Request, res: Response) => {
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
export const deleteProjectComment = asyncHandler(async (req: Request, res: Response) => {
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

  await prisma.comment.delete({
    where: { id: comment_id },
  });

  res.json({
    success: true,
    data: { message: 'Comment deleted' },
  });
});