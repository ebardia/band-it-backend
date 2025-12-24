import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';
import { log } from '../utils/captainsLog';

// Create task
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { org_id, project_id } = req.params;
  const {
    title,
    description,
    priority,
    assignedTo,
    dueDate,
  } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  if (!title) {
    throw new AppError('Title is required', ErrorTypes.VALIDATION_ERROR);
  }

  // Get project name for logging
  const project = await prisma.project.findUnique({
    where: { id: project_id },
    select: { name: true },
  });

  const task = await prisma.task.create({
    data: {
      orgId: org_id,
      projectId: project_id,
      title,
      description: description || null,
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.member.id,
      status: 'not_started',
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
  });

  // LOG ACTIVITY
  await log.taskCreated(
    org_id,
    req.member.id,
    task.id,
    task.title,
    project?.name
  );

  res.status(201).json({
    success: true,
    data: { task },
  });
});

// Get project tasks
export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const { project_id } = req.params;
  const { status, assignedTo } = req.query;

  const where: any = { projectId: project_id };
  
  if (status) where.status = status;
  if (assignedTo) where.assignedTo = assignedTo;

  const tasks = await prisma.task.findMany({
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
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' },
    ],
  });

  res.json({
    success: true,
    data: { tasks },
  });
});

// Get single task
export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const { task_id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id: task_id },
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
      project: {
        include: {
          proposal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  res.json({
    success: true,
    data: { task },
  });
});

// Update task
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { org_id, project_id, task_id } = req.params;
  const { title, description, status, priority, assignedTo, dueDate } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const task = await prisma.task.findUnique({
    where: { id: task_id },
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
  });
  
  if (!task) {
    throw new AppError('Task not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // Track changes for logging
  const changes: any = {};
  
  // Title change
  if (title !== undefined && title !== task.title) {
    changes.title = { from: task.title, to: title };
  }
  
  // Description change
  if (description !== undefined && description !== task.description) {
    changes.description = { 
      from: task.description || 'none', 
      to: description || 'none' 
    };
  }
  
  // Status change
  if (status !== undefined && status !== task.status) {
    changes.status = { from: task.status, to: status };
  }
  
  // Priority change
  if (priority !== undefined && priority !== task.priority) {
    changes.priority = { from: task.priority, to: priority };
  }
  
  // Assignment change
  if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
    const oldAssignee = task.assignee 
      ? (task.assignee.user.displayName || `${task.assignee.user.firstName} ${task.assignee.user.lastName}`)
      : 'unassigned';
    
    let newAssignee = 'unassigned';
    if (assignedTo) {
      const newMember = await prisma.member.findUnique({
        where: { id: assignedTo },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      });
      newAssignee = newMember 
        ? (newMember.user.displayName || `${newMember.user.firstName} ${newMember.user.lastName}`)
        : 'unknown';
    }
    
    changes.assignedTo = { from: oldAssignee, to: newAssignee };
  }
  
  // Due date change
  if (dueDate !== undefined) {
    const oldDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'none';
    const newDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'none';
    if (oldDate !== newDate) {
      changes.dueDate = { from: oldDate, to: newDate };
    }
  }

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date();
    }
  }
  if (priority !== undefined) updates.priority = priority;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await prisma.task.update({
    where: { id: task_id },
    data: updates,
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
  });

  // Update member stats if completed
  if (status === 'completed' && task.status !== 'completed' && task.assignedTo) {
    await prisma.member.update({
      where: { id: task.assignedTo },
      data: { tasksCompleted: { increment: 1 } },
    });
  }

  // LOG ACTIVITY (only if there were actual changes)
  if (Object.keys(changes).length > 0) {
    await log.taskUpdated(
      org_id,
      req.member.id,
      task_id,
      updated.title,
      changes
    );
  }

  res.json({
    success: true,
    data: { task: updated },
  });
});

// Delete task
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { org_id, project_id, task_id } = req.params;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const task = await prisma.task.findUnique({ where: { id: task_id } });
  
  if (!task) {
    throw new AppError('Task not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // LOG ACTIVITY (before deletion)
  await log.taskDeleted(
    org_id,
    req.member.id,
    task_id,
    task.title
  );

  await prisma.task.delete({ where: { id: task_id } });

  res.json({
    success: true,
    data: { message: 'Task deleted' },
  });
});

// Complete task
export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  const { org_id, project_id, task_id } = req.params;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const task = await prisma.task.findUnique({ where: { id: task_id } });
  
  if (!task) {
    throw new AppError('Task not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (task.status === 'completed') {
    throw new AppError('Task already completed', ErrorTypes.VALIDATION_ERROR);
  }

  const updated = await prisma.task.update({
    where: { id: task_id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // Update member stats
  if (task.assignedTo) {
    await prisma.member.update({
      where: { id: task.assignedTo },
      data: { tasksCompleted: { increment: 1 } },
    });
  }

  // LOG ACTIVITY
  await log.taskCompleted(
    org_id,
    req.member.id,
    task_id,
    task.title
  );

  res.json({
    success: true,
    data: { task: updated },
  });
});