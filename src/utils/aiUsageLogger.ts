import prisma from '../config/database';

interface LogAiUsageParams {
  bandId: string;
  memberId: string;
  agentType: string;
  action: string;
  proposalId?: string;
  input: any;
  output: any;
  tokensUsed: number;
  cost: number;
  energyKwh: number;
  waterLiters: number;
  carbonKg: number;
}

export async function logAiUsage(params: LogAiUsageParams) {
  await prisma.aiAgentAction.create({
    data: {
      bandId: params.bandId,
      memberId: params.memberId,
      agentType: params.agentType,
      action: params.action,
      proposalId: params.proposalId,
      input: params.input,
      output: params.output,
      tokensUsed: params.tokensUsed,
      cost: params.cost,
      energyKwh: params.energyKwh,
      waterLiters: params.waterLiters,
      carbonKg: params.carbonKg,
    },
  });
}

export async function getBandAiUsage(bandId: string, startDate?: Date, endDate?: Date) {
  const where: any = { bandId };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const actions = await prisma.aiAgentAction.findMany({
    where,
    select: {
      agentType: true,
      tokensUsed: true,
      cost: true,
      energyKwh: true,
      waterLiters: true,
      carbonKg: true,
      createdAt: true,
    },
  });

  // Aggregate by agent type
  const byAgentType: Record<string, any> = {};
  let totalTokens = 0;
  let totalCost = 0;
  let totalEnergy = 0;
  let totalWater = 0;
  let totalCarbon = 0;

  for (const action of actions) {
    const type = action.agentType;
    
    if (!byAgentType[type]) {
      byAgentType[type] = {
        count: 0,
        tokens: 0,
        cost: 0,
        energy: 0,
        water: 0,
        carbon: 0,
      };
    }

    byAgentType[type].count++;
    byAgentType[type].tokens += action.tokensUsed;
    byAgentType[type].cost += Number(action.cost);
    byAgentType[type].energy += Number(action.energyKwh || 0);
    byAgentType[type].water += Number(action.waterLiters || 0);
    byAgentType[type].carbon += Number(action.carbonKg || 0);

    totalTokens += action.tokensUsed;
    totalCost += Number(action.cost);
    totalEnergy += Number(action.energyKwh || 0);
    totalWater += Number(action.waterLiters || 0);
    totalCarbon += Number(action.carbonKg || 0);
  }

  return {
    byAgentType,
    totals: {
      uses: actions.length,
      tokens: totalTokens,
      cost: totalCost,
      energyKwh: totalEnergy,
      waterLiters: totalWater,
      carbonKg: totalCarbon,
    },
  };
}