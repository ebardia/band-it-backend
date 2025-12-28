import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Get Captain's Log entries for an Band
 * Supports filtering by type, actor, date range, entity
 */
export const getCaptainsLog = async (req: Request, res: Response) => {
  try {
    const { band_Id } = req.params;
    const {
      entityType,
      actorId,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    // Build filter
    const where: any = {
      bandId: band_Id,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate as string);
      }
    }

    // Get entries with pagination
    const [entries, total] = await Promise.all([
      prisma.captainsLog.findMany({
        where,
        include: {
          actor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.captainsLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        entries,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Failed to get Captain\'s Log:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAPTAINS_LOG_ERROR',
        message: 'Failed to retrieve Captain\'s Log',
      },
    });
  }
};

/**
 * Get Captain's Log entry by ID
 */
export const getCaptainsLogEntry = async (req: Request, res: Response) => {
  try {
    const { band_Id, entry_id } = req.params;

    const entry = await prisma.captainsLog.findFirst({
      where: {
        id: entry_id,
        bandId: band_Id,
      },
      include: {
        actor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Captain\'s Log entry not found',
        },
      });
    }

    res.json({
      success: true,
      data: { entry },
    });
  } catch (error) {
    console.error('Failed to get Captain\'s Log entry:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAPTAINS_LOG_ERROR',
        message: 'Failed to retrieve entry',
      },
    });
  }
};
