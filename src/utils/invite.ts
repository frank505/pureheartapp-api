import { Group } from '../models';

/**
 * Generate a unique group invite code with high entropy and ensure it does not collide.
 * - Uses 22-character alphanumeric codes (~131 bits of entropy).
 * - Retries a few times in the unlikely event of a collision.
 */
export async function generateUniqueGroupInviteCode(length: number = 22): Promise<string> {
  const { default: cryptoRandomString } = await import('crypto-random-string');
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = cryptoRandomString({ length, type: 'alphanumeric' });
    const existing = await Group.findOne({ where: { inviteCode: code } });
    if (!existing) {
      return code;
    }
  }
  // Extremely unlikely to reach here; fallback to a longer code
  return cryptoRandomString({ length: Math.max(length + 8, 30), type: 'alphanumeric' });
}


