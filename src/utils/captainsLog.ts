import prisma from '../config/database';

interface LogEntry {
  orgId: string;
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
        orgId: entry.orgId,
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
  proposalCreated: (orgId: string, actorId: string, proposalId: string, proposalTitle: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
    }),

  proposalSubmitted: (orgId: string, actorId: string, proposalId: string, proposalTitle: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'submit',
      actionPast: 'submitted',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
    }),

  proposalReviewed: (
    orgId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    approved: boolean,
    feedback?: string
  ) =>
    logActivity({
      orgId,
      actorId,
      action: approved ? 'approve' : 'request_changes',
      actionPast: approved ? 'approved' : 'requested changes on',
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
      context: { approved, feedback },
    }),

  proposalVoted: (
    orgId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    vote: string,
    comment?: string
  ) =>
    logActivity({
      orgId,
      actorId,
      action: 'vote',
      actionPast: `voted '${vote}' on`,
      entityType: 'proposal',
      entityId: proposalId,
      entityName: proposalTitle,
      context: { vote, comment },
    }),

  proposalFinalized: (
    orgId: string,
    actorId: string,
    proposalId: string,
    proposalTitle: string,
    approved: boolean
  ) =>
    logActivity({
      orgId,
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
    orgId: string,
    actorId: string,
    projectId: string,
    projectName: string,
    proposalTitle?: string
  ) =>
    logActivity({
      orgId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
      context: { fromProposal: proposalTitle },
    }),

  projectUpdated: (
    orgId: string,
    actorId: string,
    projectId: string,
    projectName: string,
    changes: any
  ) =>
    logActivity({
      orgId,
      actorId,
      action: 'update',
      actionPast: 'updated',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
      context: { changes },
    }),

  projectDeleted: (orgId: string, actorId: string, projectId: string, projectName: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'delete',
      actionPast: 'deleted',
      entityType: 'project',
      entityId: projectId,
      entityName: projectName,
    }),

  // Tasks
  taskCreated: (
    orgId: string,
    actorId: string,
    taskId: string,
    taskTitle: string,
    projectName?: string
  ) =>
    logActivity({
      orgId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      context: { project: projectName },
    }),

  taskUpdated: (orgId: string, actorId: string, taskId: string, taskTitle: string, changes: any) =>
    logActivity({
      orgId,
      actorId,
      action: 'update',
      actionPast: 'updated',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      context: { changes },
    }),

  taskCompleted: (orgId: string, actorId: string, taskId: string, taskTitle: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'complete',
      actionPast: 'completed',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
    }),

  taskDeleted: (orgId: string, actorId: string, taskId: string, taskTitle: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'delete',
      actionPast: 'deleted',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
    }),

  // Members
  memberInvited: (orgId: string, actorId: string, invitedEmail: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'invite',
      actionPast: 'invited',
      entityType: 'member',
      entityName: invitedEmail,
    }),

  memberJoined: (orgId: string, memberId: string, memberName: string) =>
    logActivity({
      orgId,
      actorId: memberId,
      action: 'join',
      actionPast: 'joined',
      entityType: 'member',
      entityId: memberId,
      entityName: memberName,
    }),

  // Organization
  organizationCreated: (orgId: string, actorId: string, orgName: string) =>
    logActivity({
      orgId,
      actorId,
      action: 'create',
      actionPast: 'created',
      entityType: 'organization',
      entityId: orgId,
      entityName: orgName,
    }),
};