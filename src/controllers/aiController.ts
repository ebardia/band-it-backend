import { Request, Response } from 'express';
import { asyncHandler, AppError, ErrorTypes } from '../middleware/errorHandler';
import OpenAI from 'openai';
import { logAiUsage, getBandAiUsage as getUsageStats } from '../utils/aiUsageLogger';
import prisma from '../config/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate proposal with AI
export const generateProposal = asyncHandler(async (req: Request, res: Response) => {
  const { idea, bandContext, bandId } = req.body;
  const userId = (req as any).user?.userId;


  if (!idea) {
    throw new AppError('Idea description is required', ErrorTypes.VALIDATION_ERROR);
  }

  if (!bandId) {
    throw new AppError('Band ID is required', ErrorTypes.VALIDATION_ERROR);
  }

  if (!userId) {
    throw new AppError('User not authenticated', ErrorTypes.UNAUTHORIZED);
  }

  const startTime = Date.now();

  const prompt = `You are an expert proposal writer helping a collective governance organization.

Band Context: ${bandContext || 'A collaborative group working together'}

User's Idea: ${idea}

Generate a well-structured, professional proposal with these sections:

1. **Title**: Clear, action-oriented title (max 80 chars)
2. **Objective**: What we're trying to achieve (2-3 sentences, specific and measurable)
3. **Description**: Detailed plan of what we'll do (4-6 sentences, include steps and approach)
4. **Rationale**: Why this matters (3-4 sentences, benefits and strategic value)
5. **Success Criteria**: How we'll know it's done (3-5 specific, measurable outcomes as bullet points)

Write in a collaborative, professional tone. Be specific and actionable.

Format as JSON:
{
  "title": "...",
  "objective": "...",
  "description": "...",
  "rationale": "...",
  "successCriteria": "..."
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that writes clear, professional governance proposals. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  // Extract response
  const content = response.choices[0].message.content;
  if (!content) {
    throw new AppError('AI did not generate a response', ErrorTypes.INTERNAL_ERROR);
  }

  // Parse JSON (clean markdown formatting if present)
  let proposalData;
  try {
    const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
    proposalData = JSON.parse(jsonText);
  } catch (error) {
    throw new AppError('Failed to parse AI response', ErrorTypes.INTERNAL_ERROR);
  }

  // Calculate resource usage
  const tokensUsed = response.usage?.total_tokens || 0;
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;

  // Energy estimates (rough calculations)
  // GPT-4o-mini: ~0.0002 kWh per 1000 tokens
  const energyKwh = (tokensUsed / 1000) * 0.0002;
  
  // Water usage: ~0.5 liters per kWh (data center cooling)
  const waterLiters = energyKwh * 0.5;
  
  // Carbon: ~0.5 kg CO2 per kWh (US grid average)
  const carbonKg = energyKwh * 0.5;

  // Cost calculation (GPT-4o-mini pricing)
  // $0.150 per 1M input tokens, $0.600 per 1M output tokens
  const costUsd = (promptTokens / 1000000) * 0.15 + (completionTokens / 1000000) * 0.60;

  // Get member ID for this user in this band
  const member = await prisma.member.findUnique({
    where: {
      bandId_userId: {
        bandId,
        userId,
      },
    },
  });

  if (!member) {
    throw new AppError('User is not a member of this band', ErrorTypes.FORBIDDEN);
  }

  // Log AI usage to database
  await logAiUsage({
    bandId,
    memberId: member.id,
    agentType: 'proposal_writer',
    action: 'generate_proposal',
    input: { idea, bandContext },
    output: proposalData,
    tokensUsed,
    cost: costUsd,
    energyKwh,
    waterLiters,
    carbonKg,
  });

  res.json({
    success: true,
    data: {
      proposal: proposalData,
      aiMetrics: {
        model: 'gpt-4o-mini',
        tokensUsed,
        promptTokens,
        completionTokens,
        durationMs,
        energyKwh: parseFloat(energyKwh.toFixed(6)),
        waterLiters: parseFloat(waterLiters.toFixed(4)),
        carbonKg: parseFloat(carbonKg.toFixed(6)),
        costUsd: parseFloat(costUsd.toFixed(4)),
      },
    },
  });
});

// Get band AI usage statistics
export const getBandAiUsage = asyncHandler(async (req: Request, res: Response) => {
  const { id: bandId } = req.params;
  const { startDate, endDate } = req.query;

  // Default to current month if no dates provided
  const start = startDate 
    ? new Date(startDate as string)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  
  const end = endDate
    ? new Date(endDate as string)
    : new Date();

  const usage = await getUsageStats(bandId, start, end);

  res.json({
    success: true,
    data: {
      usage,
      period: {
        start,
        end,
      },
    },
  });
});

// Generate band profile with AI
export const generateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { description, bandId } = req.body;
  const userId = (req as any).user?.userId;

  if (!description) {
    throw new AppError('Band description is required', ErrorTypes.VALIDATION_ERROR);
  }

  if (!bandId) {
    throw new AppError('Band ID is required', ErrorTypes.VALIDATION_ERROR);
  }

  if (!userId) {
    throw new AppError('User not authenticated', ErrorTypes.UNAUTHORIZED);
  }

  const startTime = Date.now();

  const prompt = `You are an expert at helping organizations articulate their mission, values, and governance structure.

Based on this description of a collaborative organization:
${description}

Generate a comprehensive profile with these sections:

1. **Tagline**: A compelling one-sentence tagline (max 100 chars)
2. **Full Description**: An engaging 2-3 paragraph description of who they are and what they do
3. **Core Values**: 4-6 core values, each with a name and 1-2 sentence explanation
4. **Decision Guidelines**: How the band makes decisions and why (2-3 sentences)
5. **Inclusion Statement**: Commitment to diversity and inclusion (1-2 sentences)
6. **Membership Policy**: How people can join and what's expected (2-3 sentences)

Write in a warm, professional, inclusive tone. Be specific and authentic.

Format as JSON:
{
  "tagline": "...",
  "fullDescription": "...",
  "coreValues": [
    {"name": "Transparency", "description": "..."},
    {"name": "Collaboration", "description": "..."}
  ],
  "decisionGuidelines": "...",
  "inclusionStatement": "...",
  "membershipPolicy": "..."
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that helps organizations define their values and governance. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  const content = response.choices[0].message.content;
  if (!content) {
    throw new AppError('AI did not generate a response', ErrorTypes.INTERNAL_ERROR);
  }

  let profileData;
  try {
    const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
    profileData = JSON.parse(jsonText);
  } catch (error) {
    throw new AppError('Failed to parse AI response', ErrorTypes.INTERNAL_ERROR);
  }

  const tokensUsed = response.usage?.total_tokens || 0;
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;

  const energyKwh = (tokensUsed / 1000) * 0.0002;
  const waterLiters = energyKwh * 0.5;
  const carbonKg = energyKwh * 0.5;
  const costUsd = (promptTokens / 1000000) * 0.15 + (completionTokens / 1000000) * 0.60;

  const member = await prisma.member.findUnique({
    where: {
      bandId_userId: {
        bandId,
        userId,
      },
    },
  });

  if (!member) {
    throw new AppError('User is not a member of this band', ErrorTypes.FORBIDDEN);
  }

  // Log AI usage
  await logAiUsage({
    bandId,
    memberId: member.id,
    agentType: 'profile_generator',
    action: 'generate_profile',
    input: { description },
    output: profileData,
    tokensUsed,
    cost: costUsd,
    energyKwh,
    waterLiters,
    carbonKg,
  });

  res.json({
    success: true,
    data: {
      profile: profileData,
      aiMetrics: {
        model: 'gpt-4o-mini',
        tokensUsed,
        promptTokens,
        completionTokens,
        durationMs,
        energyKwh: parseFloat(energyKwh.toFixed(6)),
        waterLiters: parseFloat(waterLiters.toFixed(4)),
        carbonKg: parseFloat(carbonKg.toFixed(6)),
        costUsd: parseFloat(costUsd.toFixed(4)),
      },
    },
  });
});