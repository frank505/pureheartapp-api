import crypto from 'crypto';
import { AccountabilityPartner } from '../models';

/**
 * Generates a random, unique hash for accountability partner invitations.
 * 
 * This function creates a cryptographically-secure random hash and ensures its uniqueness
 * in the `accountability_partners` table before returning it.
 * 
 * @returns {Promise<string>} A unique hash for the invitation.
 */
export const generateUniqueHash = async (): Promise<string> => {
  let hash: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random 8-character hash
    hash = crypto.randomBytes(4).toString('hex');
    
    // Check if the hash already exists in the database
    const existingPartner = await AccountabilityPartner.findOne({ where: { hash } });
    
    if (!existingPartner) {
      isUnique = true;
    }
  }

  return hash!;
};
