import prisma from '../config/database';

interface LogEntry {
  bandId: string;
  actorId: string;
  action: string;
  actionPast: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  context?: any;
  actorType?: string;
}

/**
 * Captain's Log - Comprehensive audit trail for all org actions
 * Designed for maximum flexibility - context field can store ANY data
 */
export const logActivity = async (entry: LogEntry) => {
  try {
    await prisma.captainsLog.create({
      data: {
        bandId: entry.bandId,
        actorId: entry.actorId,
        actorType: entry.actorType || 'member',
        action: entry.action,
        actionPast: entry.actionPast,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        entityName: entry.entityName || null,
        context: entry.context || null,
      },
    });
  } catch (error) {
    // Don't let logging failures break the app
    console.error('Captain\'s Log error:', error);
  }
};

// Helper functions for common actions
export const log = {
  // Proposals
  proposalCreated: (bandId: string, actorId: string, proposalId: string, proposalTitle: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
    }),

  proposalSubmitted: (bandId: string, actorId: string, proposalId: string, proposalTitle: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'submit',
      actionPast: 'submitted',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
    }),

  proposalReviewed: (
    bandId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    approved: boolean,
    feedback?: string
  ) =>
    logActivity({
      bandId,
      actorId,
      action: approved ? 'approve' : 'request_changes',
      actionPast: approved ? 'approved' : 'requested changes on',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
      context: { approved, feedback },
    }),

  proposalVoted: (
    bandId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    vote: string,
    comment?: string
  ) =>
    logActivity({
      bandId,
      actorId,
      action: 'vote',
      actionPast: `voted '${vote}' on`,
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
      context: { vote, comment },
    }),

  proposalFinalized: (
    bandId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    approved: boolean
  ) =>
    logActivity({
      bandId,
      actorId,
      action: 'finalize',
      actionPast: approved ? 'finalized as approved' : 'finalized as rejected',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
      context: { approved },
    }),

  // Projects
  projectCreated: (
    bandId: string,
    actorId: string,
    projectId: string,
    projectName: string,
    proposalTitle?: string
  ) =>
    logActivity({
      bandId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
      context: { fromProposal: proposalTitle },
    }),

  projectUpdated: (
    bandId: string,
    actorId: string,
    projectId: string,
    projectName: string,
    changes: any
  ) =>
    logActivity({
      bandId,
      actorId,
      action: 'update',
      actionPast: 'updated',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
      context: { changes },
    }),

  projectDeleted: (bandId: string, actorId: string, projectId: string, projectName: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'delete',
      actionPast: 'deleted',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
    }),

  // Tasks
  taskCreated: (
    bandId: string,
    actorId: string,
    taskId: string,
    taskTitle: string,
    projectName?: string
  ) =>
    logActivity({
      bandId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      context: { project: projectName },
    }),

  taskUpdated: (bandId: string, actorId: string, taskId: string, taskTitle: string, changes: any) =>
    logActivity({
      bandId,
      actorId,
      action: 'update',
      actionPast: 'updated',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      context: { changes },
    }),

  taskCompleted: (bandId: string, actorId: string, taskId: string, taskTitle: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'complete',
      actionPast: 'completed',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
    }),

  taskDeleted: (bandId: string, actorId: string, taskId: string, taskTitle: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'delete',
      actionPast: 'deleted',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
    }),

  // Members
  memberInvited: (bandId: string, actorId: string, invitedEmail: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'invite',
      actionPast: 'invited',
      entityType: 'member',
      entityName: invitedEmail,
    }),

  memberJoined: (bandId: string, memberId: string, memberName: string) =>
    logActivity({
      bandId,
      actorId: memberId,
      action: 'join',
      actionPast: 'joined',
      entityType: 'member',
      entityId: memberId,
      entityName: memberName,
    }),

  // Band
  organizationCreated: (bandId: string, actorId: string, orgName: string) =>
    logActivity({
      bandId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'Band',
      entityId: bandId,
      entityName: orgName,
    }),
};
