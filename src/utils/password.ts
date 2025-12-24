import bcrypt from 'bcrypt';
import crypto from 'crypto';

// From Technical Architecture v2.0 Gap 8: bcrypt with 12 rounds
const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate reset token
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate invite token
export const generateInviteToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};