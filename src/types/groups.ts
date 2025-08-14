// Group domain types

export type GroupPrivacy = 'public' | 'private';

export type GroupRole = 'owner' | 'moderator' | 'member';

// Simple placeholders for AI-related config; can be expanded later
export type AIBehavior = 'qa' | 'summary' | 'moderation';
export type DeliveryMode = 'inline' | 'dm';

export interface UserRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface GroupAISettings {
  enabled: boolean;
  modes: AIBehavior[];
  deliverTo: DeliveryMode;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  privacy: GroupPrivacy;
  iconUrl?: string;
  ownerId: number;
  membersCount: number;
  ai?: GroupAISettings;
  inviteCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  user: UserRef;
  role: GroupRole;
  mutedUntil?: string | null;
  banned?: boolean;
  joinedAt: string;
}

export interface GroupInvite {
  id: string;
  email?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

export interface GroupJoinRequest {
  id: string;
  user: UserRef;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  decidedAt?: string;
}


