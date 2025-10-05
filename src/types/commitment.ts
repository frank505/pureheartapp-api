/**
 * Action Commitments System - Type Definitions
 */

export enum CommitmentType {
  ACTION = 'ACTION',
  FINANCIAL = 'FINANCIAL',
  HYBRID = 'HYBRID'
}

export enum CommitmentStatus {
  ACTIVE = 'ACTIVE',
  ACTION_PENDING = 'ACTION_PENDING',
  ACTION_PROOF_SUBMITTED = 'ACTION_PROOF_SUBMITTED',
  ACTION_COMPLETED = 'ACTION_COMPLETED',
  ACTION_OVERDUE = 'ACTION_OVERDUE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ActionCategory {
  COMMUNITY_SERVICE = 'COMMUNITY_SERVICE',
  CHURCH_SERVICE = 'CHURCH_SERVICE',
  CHARITY = 'CHARITY',
  HELPING_INDIVIDUALS = 'HELPING_INDIVIDUALS',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  EDUCATION = 'EDUCATION',
  HEALTHCARE = 'HEALTHCARE',
  CUSTOM = 'CUSTOM'
}

export enum ActionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum ProofMediaType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO'
}

export enum RejectionReason {
  FACE_NOT_VISIBLE = 'FACE_NOT_VISIBLE',
  WRONG_LOCATION = 'WRONG_LOCATION',
  ACTION_NOT_PERFORMED = 'ACTION_NOT_PERFORMED',
  SUSPICIOUS = 'SUSPICIOUS',
  OTHER = 'OTHER'
}

export interface IAction {
  id: number;
  title: string;
  description: string;
  category: ActionCategory;
  difficulty: ActionDifficulty;
  estimatedHours: number;
  proofInstructions: string;
  requiresLocation: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommitment {
  id: number;
  userId: number;
  commitmentType: CommitmentType;
  actionId?: number;
  customActionDescription?: string;
  targetDate: Date;
  partnerId?: number;
  requirePartnerVerification: boolean;
  allowPublicShare: boolean;
  status: CommitmentStatus;
  relapseReportedAt?: Date;
  actionDeadline?: Date;
  actionCompletedAt?: Date;
  financialAmount?: number;
  financialPaidAt?: Date;
  charityId?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IActionProof {
  id: number;
  commitmentId: number;
  userId: number;
  mediaType: ProofMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  userNotes?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  capturedAt: Date;
  submittedAt: Date;
  partnerApproved?: boolean;
  verifiedAt?: Date;
  verifiedBy?: number;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;
  isLateSubmission: boolean;
  isSuperseded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserServiceStats {
  id: number;
  userId: number;
  totalServiceHours: number;
  totalMoneyDonated: number;
  totalActionsCompleted: number;
  redemptionStreak: number;
  longestRedemptionStreak: number;
  lastRedemptionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRedemptionWall {
  id: number;
  commitmentId: number;
  userId: number;
  actionId: number;
  proofId: number;
  isAnonymous: boolean;
  userReflection?: string;
  encouragementCount: number;
  commentCount: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface ICreateCommitmentRequest {
  userId: number;
  commitmentType: CommitmentType;
  actionId?: number;
  customActionDescription?: string;
  targetDate: string;
  partnerId?: number;
  requirePartnerVerification: boolean;
  allowPublicShare: boolean;
  financialAmount?: number;
}

export interface ICreateCommitmentResponse {
  success: boolean;
  commitmentId: number;
  message: string;
  data: {
    commitmentType: CommitmentType;
    actionTitle?: string;
    targetDate: string;
    status: CommitmentStatus;
    actionDetails?: {
      estimatedHours: number;
      proofInstructions: string;
      deadline: string;
    };
  };
}

export interface IReportRelapseRequest {
  userId: number;
  relapseDate?: string;
  notes?: string;
}

export interface IReportRelapseResponse {
  success: boolean;
  message: string;
  data: {
    commitmentId: number;
    status: CommitmentStatus;
    actionRequired?: {
      title: string;
      description: string;
      estimatedHours: number;
      proofInstructions: string;
      deadline: string;
    };
    nearbyLocations?: Array<{
      name: string;
      address: string;
      distance?: string;
      phone?: string;
    }>;
  };
}

export interface ISubmitProofRequest {
  userId: number;
  mediaType: ProofMediaType;
  userNotes?: string;
  latitude?: number;
  longitude?: number;
  capturedAt: string;
}

export interface ISubmitProofResponse {
  success: boolean;
  message: string;
  data: {
    proofId: number;
    commitmentId: number;
    status: CommitmentStatus;
    mediaUrl: string;
    thumbnailUrl?: string;
    submittedAt: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    verification: {
      required: boolean;
      partnerId?: number;
      partnerName?: string;
      autoApproveAt?: string;
    };
  };
}

export interface IVerifyProofRequest {
  partnerId: number;
  proofId: number;
  approved: boolean;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;
  encouragementMessage?: string;
}

export interface IVerifyProofResponse {
  success: boolean;
  message: string;
  data: {
    commitmentId: number;
    proofId: number;
    status: CommitmentStatus;
    verifiedAt?: string;
    verifiedBy?: number;
    rejectionReason?: RejectionReason;
    timeRemaining?: string;
    resubmitDeadline?: string;
    userStats?: {
      totalServiceHours: number;
      totalActionsCompleted: number;
      redemptionStreak: number;
    };
  };
}

export interface IServiceStatsResponse {
  success: boolean;
  data: {
    userId: number;
    stats: {
      totalServiceHours: number;
      totalMoneyDonated: number;
      totalActionsCompleted: number;
      cleanStreak?: number;
      redemptionStreak: number;
      longestRedemptionStreak: number;
    };
    breakdown: {
      byCategory: Array<{
        category: ActionCategory;
        hours: number;
        count: number;
      }>;
      byMonth: Array<{
        month: string;
        hours: number;
        count: number;
      }>;
    };
    recentActions: Array<{
      actionId: number;
      title: string;
      completedAt: string;
      hours: number;
      proofThumbnail?: string;
      verifiedBy?: string;
      userNotes?: string;
    }>;
    badges?: Array<{
      id: number;
      title: string;
      description: string;
      earnedAt: string;
    }>;
  };
}

export interface IRedemptionWallResponse {
  success: boolean;
  data: {
    redemptions: Array<{
      id: number;
      commitmentId: number;
      user: {
        displayName: string;
        isAnonymous: boolean;
      };
      action: {
        title: string;
        category: ActionCategory;
        hours: number;
      };
      proofMedia?: {
        thumbnailUrl: string;
        type: ProofMediaType;
      };
      reflection?: string;
      completedAt: string;
      stats: {
        encouragements: number;
        comments: number;
      };
    }>;
    pagination: {
      total: number;
      hasMore: boolean;
      nextOffset: number;
    };
  };
}
