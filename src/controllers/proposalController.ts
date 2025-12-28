import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import prisma from '../config/database';

// Create proposal
export const createProposal = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;
  const {
    title,
    objective,
    description,
    rationale,
    successCriteria,
    financialRequest,
    budgetBreakdown,
    votingPeriodHours,
  } = req.body;

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  // Validate
  if (!title || !objective || !description || !rationale || !successCriteria) {
    throw new AppError('Missing required fields', ErrorTypes.VALIDATION_ERROR);
  }

  const org = await prisma.band.findUnique({ where: { id: band_Id } });
  if (!org) {
    throw new AppError('Band not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  // Calculate voting end time
  const hours = votingPeriodHours || org.votingPeriodHours;
  const votingEndsAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  // Create proposal
  const proposal = await prisma.proposal.create({
    data: {
      band: {
        connect: { id: band_Id }
      },
      creator: {
        connect: { id: req.member.id }
      },
      title,
      objective,
      description,
      rationale,
      successCriteria,
      financialRequest: financialRequest || null,
      budgetBreakdown: budgetBreakdown || null,
      state: 'draft',
      votingEndsAt,
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

  // Create initial version
  // Create initial version
  await prisma.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      versionNumber: 1,
      title,
      objective,
      description,
      rationale,
      successCriteria,
      changeReason: 'Initial version',
      createdBy: req.member.id,
    },
  });

  // Update member stats
  await prisma.member.update({
    where: { id: req.member.id },
    data: { proposalCount: { increment: 1 } },
  });

  res.status(201).json({
    success: true,
    data: { proposal },
  });
});


// Get Band proposals
export const getProposals = asyncHandler(async (req: Request, res: Response) => {
  const { band_Id } = req.params;
  const { state } = req.query;

  const where: any = { bandId: band_Id };
  if (state) {
    where.state = state;
  }

  const proposals = await prisma.proposal.findMany({
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
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: { proposals },
  });
});

// Get proposal details (singular)
export const getProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id },
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
      reviewer: {
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
      votes: {
        include: {
          member: {
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
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
    },
  });

  if (!proposal) {
    throw new AppError('Proposal not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  res.json({
    success: true,
    data: { proposal },
  });
});

// Submit proposal for review (draft → in_review)
export const submitProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id },
  });

  if (!proposal) {
    throw new AppError('Proposal not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (proposal.state !== 'draft') {
    throw new AppError('Can only submit draft proposals', ErrorTypes.VALIDATION_ERROR);
  }

  const updated = await prisma.proposal.update({
    where: { id: proposal_id },
    data: {
      state: 'in_review',
      stateChangedAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: { proposal: updated },
  });
});

// Review proposal (steward only)
export const reviewProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;
  const { action, feedback } = req.body; // action: 'approve' | 'request_changes'

  if (!req.member || (req.member.role !== 'steward' && req.member.role !== 'founder')) {
    throw new AppError('Only stewards can review', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id },
  });

  if (!proposal) {
    throw new AppError('Proposal not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (proposal.state !== 'in_review') {
    throw new AppError('Proposal not under review', ErrorTypes.VALIDATION_ERROR);
  }

  const newState = action === 'approve' ? 'submitted' : 'needs_revision';

  const updated = await prisma.proposal.update({
    where: { id: proposal_id },
    data: {
      state: newState,
      stateChangedAt: new Date(),
      reviewedBy: req.member.id,
      reviewedAt: new Date(),
      reviewFeedback: feedback,
      reviewStatus: action === 'approve' ? 'approved' : 'needs_changes',
      ...(action === 'approve' && { 
        votingStartsAt: new Date(),
        state: 'voting',
      }),
    },
  });

  res.json({
    success: true,
    data: { proposal: updated },
  });
});

// Vote on proposal
// Vote on proposal
export const voteOnProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;
  const { vote, comment } = req.body; // Changed from voteType/reasoning

  if (!req.member) {
    throw new AppError('Must be a member', ErrorTypes.AUTHORIZATION_ERROR);
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id },
  });

  if (!proposal) {
    throw new AppError('Proposal not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (proposal.state !== 'voting') {
    throw new AppError('Proposal not open for voting', ErrorTypes.VALIDATION_ERROR);
  }

  if (proposal.votingEndsAt && new Date() > proposal.votingEndsAt) {
    throw new AppError('Voting period has ended', ErrorTypes.VALIDATION_ERROR);
  }

  // Check if already voted
  const existingVote = await prisma.vote.findUnique({
    where: {
      proposalId_memberId: {
        proposalId: proposal_id,
        memberId: req.member.id,
      },
    },
  });

  if (existingVote) {
    // Update existing vote and update counts
    const oldVote = existingVote.vote;
    
    const updated = await prisma.vote.update({
      where: { id: existingVote.id },
      data: {
        vote,
        comment,
      },
    });

    // Update proposal vote counts
    const voteChanges: any = {};
    
    // Decrement old vote
    if (oldVote === 'approve') voteChanges.votesApprove = { decrement: 1 };
    if (oldVote === 'reject') voteChanges.votesReject = { decrement: 1 };
    if (oldVote === 'abstain') voteChanges.votesAbstain = { decrement: 1 };
    
    // Increment new vote
    if (vote === 'approve') voteChanges.votesApprove = { increment: 1 };
    if (vote === 'reject') voteChanges.votesReject = { increment: 1 };
    if (vote === 'abstain') voteChanges.votesAbstain = { increment: 1 };

    await prisma.proposal.update({
      where: { id: proposal_id },
      data: voteChanges,
    });

    return res.json({
      success: true,
      data: { vote: updated, message: 'Vote updated' },
    });
  }

  // Create new vote
  const newVote = await prisma.vote.create({
    data: {
      proposalId: proposal_id,
      memberId: req.member.id,
      vote,
      comment,
    },
  });

  // Update proposal vote counts
  const voteCountUpdate: any = {};
  if (vote === 'approve') voteCountUpdate.votesApprove = { increment: 1 };
  if (vote === 'reject') voteCountUpdate.votesReject = { increment: 1 };
  if (vote === 'abstain') voteCountUpdate.votesAbstain = { increment: 1 };

  await prisma.proposal.update({
    where: { id: proposal_id },
    data: voteCountUpdate,
  });

  // Update member stats
  await prisma.member.update({
    where: { id: req.member.id },
    data: { votescast: { increment: 1 } },
  });

  res.status(201).json({
    success: true,
    data: { vote: newVote },
  });
});

// Check voting results and finalize if period ended
export const finalizeProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id },
    include: {
      Band: true,
      votes: true,
    },
  });

  if (!proposal) {
    throw new AppError('Proposal not found', ErrorTypes.NOT_FOUND_ERROR);
  }

  if (proposal.state !== 'voting') {
    throw new AppError('Proposal not in voting state', ErrorTypes.VALIDATION_ERROR);
  }

  if (proposal.votingEndsAt && new Date() < proposal.votingEndsAt) {
    throw new AppError('Voting period not ended', ErrorTypes.VALIDATION_ERROR);
  }

  // Calculate results
  const totalVotes = proposal.votesApprove + proposal.votesReject + proposal.votesAbstain;
  const activeMembers = await prisma.member.count({
    where: { bandId: proposal.bandId, status: 'active' },
  });

  // Check quorum
  const quorumMet = (totalVotes / activeMembers) * 100 >= proposal.Band.quorumPercentage;

  // Check approval
  const approvalRate = totalVotes > 0 ? (proposal.votesApprove / totalVotes) * 100 : 0;
  const approved = quorumMet && approvalRate >= proposal.Band.approvalThreshold;

  const updated = await prisma.proposal.update({
    where: { id: proposal_id },
    data: {
      state: approved ? 'approved' : 'rejected',
      stateChangedAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: {
      proposal: updated,
      results: {
        votesApprove: proposal.votesApprove,
        votesReject: proposal.votesReject,
        votesAbstain: proposal.votesAbstain,
        totalVotes,
        activeMembers,
        quorumMet,
        quorumPercentage: (totalVotes / activeMembers) * 100,
        approvalRate,
        approvalThreshold: proposal.Band.approvalThreshold,
        approved,
      },
    },
  });

  res.json({
    success: true,
    data: {
      proposal: updated,
      results: {
        votesApprove: proposal.votesApprove,
        votesReject: proposal.votesReject,
        votesAbstain: proposal.votesAbstain,
        totalVotes,
        activeMembers,
        quorumMet,
        quorumPercentage: (totalVotes / activeMembers) * 100,
        approvalRate,
        approvalThreshold: proposal.Band.approvalThreshold,
        approved,
      },
    },
  });
});

// Update proposal (admin/testing)
export const updateProposal = asyncHandler(async (req: Request, res: Response) => {
  const { proposal_id } = req.params;
  const { state } = req.body;

  const updated = await prisma.proposal.update({
    where: { id: proposal_id },
    data: { 
      state,
      stateChangedAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: { proposal: updated },
  });
});
