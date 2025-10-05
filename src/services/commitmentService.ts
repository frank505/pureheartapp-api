import { Op } from 'sequelize';
import Commitment from '../models/Commitment';
import Action from '../models/Action';
import ActionProof from '../models/ActionProof';
import UserServiceStats from '../models/UserServiceStats';
import RedemptionWall from '../models/RedemptionWall';
import User from '../models/User';
import { PushQueue } from '../jobs/notificationJobs';
import CharityOrganization from '../models/CharityOrganization';
import CharityDonation, { DonationStatus, PaymentMethod } from '../models/CharityDonation';
import charityPaymentService from './charityPaymentService';
import {
  CommitmentType,
  CommitmentStatus,
  ActionCategory,
  ProofMediaType,
  RejectionReason,
  ICreateCommitmentRequest,
  ICreateCommitmentResponse,
  IReportRelapseRequest,
  IReportRelapseResponse,
  ISubmitProofRequest,
  ISubmitProofResponse,
  IVerifyProofRequest,
  IVerifyProofResponse,
  IServiceStatsResponse,
  IRedemptionWallResponse,
} from '../types/commitment';

export class CommitmentService {
  /**
   * Create a new action commitment
   */
  async createCommitment(data: ICreateCommitmentRequest): Promise<ICreateCommitmentResponse> {
    // Validate user exists
    const user = await User.findByPk(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate target date
    const targetDate = new Date(data.targetDate);
    const now = new Date();
    const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
    const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

    if (targetDate < minDate) {
      throw new Error('Target date must be at least 1 day in the future');
    }
    if (targetDate > maxDate) {
      throw new Error('Target date cannot be more than 90 days in the future');
    }

    // Validate action exists (if actionId provided)
    let action = null;
    if (data.actionId) {
      action = await Action.findByPk(data.actionId);
      if (!action || !action.isActive) {
        throw new Error('Action not found or not active');
      }
    } else if (!data.customActionDescription) {
      throw new Error('Either actionId or customActionDescription must be provided');
    }

    // Validate partner exists (if partnerId provided)
    if (data.partnerId) {
      const partner = await User.findByPk(data.partnerId);
      if (!partner) {
        throw new Error('Partner not found');
      }
      // TODO: Check if partnership exists and is accepted
    }

    // Custom actions require partner verification
    if (data.customActionDescription && !data.partnerId) {
      throw new Error('Custom actions require a partner for verification');
    }

    // Create commitment
    const commitmentData: any = {
      userId: data.userId,
      commitmentType: data.commitmentType,
      targetDate,
      requirePartnerVerification: data.requirePartnerVerification,
      allowPublicShare: data.allowPublicShare,
      status: CommitmentStatus.ACTIVE,
    };
    if (data.actionId) commitmentData.actionId = data.actionId;
    if (data.customActionDescription) commitmentData.customActionDescription = data.customActionDescription;
    if (data.partnerId) commitmentData.partnerId = data.partnerId;
    if (data.financialAmount) commitmentData.financialAmount = data.financialAmount;

    const commitment = await Commitment.create(commitmentData);

    // Send notification to partner if selected
    if (data.partnerId) {
      try {
        await PushQueue.sendNotification({
          type: 'generic',
          actorId: data.userId,
          targetUserId: data.partnerId,
          title: 'Accountability Partner Request',
          body: `You've been selected as an accountability partner for a commitment. Help keep them on track!`,
          data: {
            commitmentId: commitment.id.toString(),
            commitmentType: commitment.commitmentType,
            purpose: 'partner_selected'
          },
        });
      } catch (error) {
        console.error('Failed to send partner notification:', error);
      }
    }

    // Create reminder schedule
    // TODO: Schedule reminders (7 days, 3 days, 1 day before target)

    // Build response
    const responseData: any = {
      commitmentType: commitment.commitmentType,
      targetDate: commitment.targetDate.toISOString(),
      status: commitment.status,
    };
    if (action?.title || data.customActionDescription) {
      responseData.actionTitle = action?.title || data.customActionDescription;
    }
    if (action) {
      responseData.actionDetails = {
        estimatedHours: Number(action.estimatedHours),
        proofInstructions: action.proofInstructions,
        deadline: '48 hours after relapse',
      };
    }

    const response: ICreateCommitmentResponse = {
      success: true,
      commitmentId: commitment.id,
      message: 'Action commitment created successfully',
      data: responseData,
    };

    return response;
  }

  /**
   * Report a relapse for a commitment
   */
  async reportRelapse(
    commitmentId: number,
    data: IReportRelapseRequest
  ): Promise<IReportRelapseResponse> {
    // Find commitment
    const commitment = await Commitment.findByPk(commitmentId, {
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'user' },
      ],
    });

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== data.userId) {
      throw new Error('You can only report relapses for your own commitments');
    }

    if (commitment.status !== CommitmentStatus.ACTIVE) {
      throw new Error('Commitment is not active');
    }

    if (commitment.relapseReportedAt) {
      throw new Error('Relapse already reported for this commitment');
    }

    // Update commitment
    const relapseDate = data.relapseDate ? new Date(data.relapseDate) : new Date();
    const actionDeadline = new Date(relapseDate.getTime() + 48 * 60 * 60 * 1000); // +48 hours

    await commitment.update({
      status: CommitmentStatus.ACTION_PENDING,
      relapseReportedAt: relapseDate,
      actionDeadline,
    });

    // Handle hybrid commitments - charge financial amount
    if (commitment.commitmentType === CommitmentType.HYBRID && commitment.financialAmount) {
      await this.processCharityPayment(commitment.id, commitment.userId, commitment.charityId!, commitment.financialAmount);
    }

    // Handle financial commitments - charge full amount to charity
    if (commitment.commitmentType === CommitmentType.FINANCIAL && commitment.financialAmount) {
      await this.processCharityPayment(commitment.id, commitment.userId, commitment.charityId!, commitment.financialAmount);
      // For financial-only commitments, mark as completed after payment
      await commitment.update({ 
        status: CommitmentStatus.COMPLETED,
        financialPaidAt: new Date()
      });
      return this.buildFinancialCompletionResponse(commitment);
    }

    // Send notifications
    const action = (commitment as any).action;
    try {
      await PushQueue.sendNotification({
        type: 'generic',
        targetUserId: commitment.userId,
        title: 'Action Required',
        body: `Relapse reported. You have 48 hours to complete your commitment: ${action?.title}`,
        data: {
          commitmentId: commitment.id.toString(),
          actionTitle: action?.title,
          deadline: commitment.actionDeadline?.toISOString(),
          purpose: 'relapse_reported'
        },
      });
    } catch (error) {
      console.error('Failed to send relapse notification to user:', error);
    }

    if (commitment.partnerId) {
      try {
        await PushQueue.sendNotification({
          type: 'generic',
          actorId: commitment.userId,
          targetUserId: commitment.partnerId,
          title: 'Partner Needs Support',
          body: `Your partner reported a relapse and needs to complete: ${action?.title}. Offer encouragement!`,
          data: {
            commitmentId: commitment.id.toString(),
            actionTitle: action?.title,
            deadline: commitment.actionDeadline?.toISOString(),
            purpose: 'partner_relapse_reported'
          },
        });
      } catch (error) {
        console.error('Failed to send relapse notification to partner:', error);
      }
    }

    // Schedule deadline reminders
    // TODO: Schedule reminders (24h, 12h, 2h, 1h before deadline)

    // Build response
    const response: IReportRelapseResponse = {
      success: true,
      message: 'Relapse reported. You have 48 hours to complete your action.',
      data: {
        commitmentId: commitment.id,
        status: commitment.status,
        actionRequired: action
          ? {
              title: action.title,
              description: action.description,
              estimatedHours: Number(action.estimatedHours),
              proofInstructions: action.proofInstructions,
              deadline: actionDeadline.toISOString(),
            }
          : {
              title: commitment.customActionDescription || 'Custom Action',
              description: commitment.customActionDescription || '',
              estimatedHours: 1,
              proofInstructions: 'Take photo/video proof of completion',
              deadline: actionDeadline.toISOString(),
            },
        nearbyLocations: [],
      },
    };

    return response;
  }

  /**
   * Submit proof of action completion
   */
  async submitProof(
    commitmentId: number,
    mediaFile: { url: string; thumbnailUrl?: string },
    data: ISubmitProofRequest
  ): Promise<ISubmitProofResponse> {
    // Find commitment
    const commitment = await Commitment.findByPk(commitmentId, {
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'partner' },
      ],
    });

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== data.userId) {
      throw new Error('You can only submit proof for your own commitments');
    }

    if (commitment.status !== CommitmentStatus.ACTION_PENDING && commitment.status !== CommitmentStatus.ACTION_OVERDUE) {
      throw new Error('Commitment is not in a state that accepts proof submission');
    }

    // Check if this is a late submission
    const now = new Date();
    const isLate = commitment.actionDeadline ? now > commitment.actionDeadline : false;

    // Mark previous proofs as superseded
    await ActionProof.update(
      { isSuperseded: true },
      {
        where: {
          commitmentId: commitment.id,
          isSuperseded: false,
        },
      }
    );

    // Create action proof
    const proofData: any = {
      commitmentId: commitment.id,
      userId: data.userId,
      mediaType: data.mediaType,
      mediaUrl: mediaFile.url,
      capturedAt: new Date(data.capturedAt),
      submittedAt: now,
      isLateSubmission: isLate,
      isSuperseded: false,
    };
    if (mediaFile.thumbnailUrl) proofData.thumbnailUrl = mediaFile.thumbnailUrl;
    if (data.userNotes) proofData.userNotes = data.userNotes;
    if (data.latitude) proofData.latitude = data.latitude;
    if (data.longitude) proofData.longitude = data.longitude;

    const proof = await ActionProof.create(proofData);

    // Update commitment status
    await commitment.update({
      status: CommitmentStatus.ACTION_PROOF_SUBMITTED,
    });

    // Stop deadline reminders
    // TODO: Cancel scheduled deadline reminders

    // Send notification to partner
    const partner = (commitment as any).partner;
    if (commitment.partnerId && partner) {
      try {
        const action = (commitment as any).action;
        await PushQueue.sendNotification({
          type: 'generic',
          actorId: commitment.userId,
          targetUserId: commitment.partnerId,
          title: 'Proof Verification Needed',
          body: `Your partner submitted proof for "${action?.title}". Please review and verify.`,
          data: {
            commitmentId: commitment.id.toString(),
            proofId: proof.id.toString(),
            actionTitle: action?.title,
            purpose: 'proof_verification_needed'
          },
        });
      } catch (error) {
        console.error('Failed to send proof verification notification:', error);
      }
    } else {
      // Schedule auto-approval after 24 hours
      // TODO: Schedule auto-approval job (handled by cron job in commitmentJobs.ts)
    }

    // Build response
    const responseData: any = {
      proofId: proof.id,
      commitmentId: commitment.id,
      status: commitment.status,
      mediaUrl: proof.mediaUrl,
      submittedAt: proof.submittedAt.toISOString(),
      verification: {
        required: commitment.requirePartnerVerification,
      },
    };

    if (proof.thumbnailUrl) responseData.thumbnailUrl = proof.thumbnailUrl;

    if (data.latitude && data.longitude) {
      responseData.location = {
        latitude: data.latitude,
        longitude: data.longitude,
      };
      if (proof.locationAddress) responseData.location.address = proof.locationAddress;
    }

    if (commitment.partnerId) responseData.verification.partnerId = commitment.partnerId;
    if (partner) responseData.verification.partnerName = `${partner.firstName} ${partner.lastName}`;
    if (!commitment.requirePartnerVerification) {
      responseData.verification.autoApproveAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }

    const response: ISubmitProofResponse = {
      success: true,
      message: commitment.requirePartnerVerification
        ? 'Proof submitted successfully. Waiting for partner verification.'
        : 'Proof submitted successfully. It will be auto-approved in 24 hours.',
      data: responseData,
    };

    return response;
  }

  /**
   * Verify proof submitted by partner
   */
  async verifyProof(commitmentId: number, data: IVerifyProofRequest): Promise<IVerifyProofResponse> {
    // Find commitment
    const commitment = await Commitment.findByPk(commitmentId, {
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'user' },
      ],
    });

    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.partnerId !== data.partnerId) {
      throw new Error('You are not authorized to verify this proof');
    }

    if (commitment.status !== CommitmentStatus.ACTION_PROOF_SUBMITTED) {
      throw new Error('No proof submitted for this commitment');
    }

    // Find proof
    const proof = await ActionProof.findByPk(data.proofId);
    if (!proof || proof.commitmentId !== commitmentId) {
      throw new Error('Proof not found or does not belong to this commitment');
    }

    const now = new Date();

    if (data.approved) {
      // APPROVE PROOF
      await proof.update({
        partnerApproved: true,
        verifiedAt: now,
        verifiedBy: data.partnerId,
      });

      // Get action details
      const action = (commitment as any).action;
      const estimatedHours = action ? Number(action.estimatedHours) : 1;

      // Complete commitment
      await commitment.update({
        status: CommitmentStatus.ACTION_COMPLETED,
        actionCompletedAt: now,
      });

      // Update user service stats
      let stats = await UserServiceStats.findOne({ where: { userId: commitment.userId } });
      if (!stats) {
        stats = await UserServiceStats.create({
          userId: commitment.userId,
          totalServiceHours: 0,
          totalMoneyDonated: 0,
          totalActionsCompleted: 0,
          redemptionStreak: 0,
          longestRedemptionStreak: 0,
        });
      }

      const newServiceHours = Number(stats.totalServiceHours) + estimatedHours;
      const newActionsCompleted = stats.totalActionsCompleted + 1;
      const newRedemptionStreak = stats.redemptionStreak + 1;
      const newLongestStreak = Math.max(newRedemptionStreak, stats.longestRedemptionStreak);

      await stats.update({
        totalServiceHours: newServiceHours,
        totalActionsCompleted: newActionsCompleted,
        redemptionStreak: newRedemptionStreak,
        longestRedemptionStreak: newLongestStreak,
        lastRedemptionAt: now,
      });

      // Add to financial if hybrid
      if (commitment.commitmentType === CommitmentType.HYBRID && commitment.financialAmount) {
        await stats.update({
          totalMoneyDonated: stats.totalMoneyDonated + commitment.financialAmount,
        });
      }

      // Create redemption wall entry if public sharing enabled
      if (commitment.allowPublicShare && action) {
        const wallData: any = {
          commitmentId: commitment.id,
          userId: commitment.userId,
          actionId: action.id,
          proofId: proof.id,
          isAnonymous: true,
          encouragementCount: 0,
          commentCount: 0,
          isVisible: true,
        };
        if (proof.userNotes) wallData.userReflection = proof.userNotes;
        await RedemptionWall.create(wallData);
      }

      // Send notification to user
      // TODO: Send success notification with encouragement message

      // Check for achievement/badge milestones
      // TODO: Award badges for milestones

      const response: IVerifyProofResponse = {
        success: true,
        message: 'Proof approved. Action marked as complete.',
        data: {
          commitmentId: commitment.id,
          proofId: proof.id,
          status: commitment.status,
          verifiedAt: now.toISOString(),
          verifiedBy: data.partnerId,
          userStats: {
            totalServiceHours: Number(stats.totalServiceHours),
            totalActionsCompleted: stats.totalActionsCompleted,
            redemptionStreak: stats.redemptionStreak,
          },
        },
      };

      return response;
    } else {
      // REJECT PROOF
      if (!data.rejectionReason) {
        throw new Error('Rejection reason is required when rejecting proof');
      }

      const updateData: any = {
        partnerApproved: false,
        rejectionReason: data.rejectionReason,
      };
      if (data.rejectionNotes) updateData.rejectionNotes = data.rejectionNotes;

      await proof.update(updateData);

      // Revert commitment status to ACTION_PENDING
      await commitment.update({
        status: CommitmentStatus.ACTION_PENDING,
      });

      // Calculate remaining time
      const deadline = commitment.actionDeadline || new Date();
      const timeRemaining = deadline.getTime() - now.getTime();
      const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

        // Send notification to user
        try {
          const action = await Action.findByPk(commitment.actionId);
          const reasonText = data.rejectionReason ? ` Reason: ${data.rejectionReason.replace(/_/g, ' ').toLowerCase()}` : '';
          await PushQueue.sendNotification({
            type: 'generic',
            actorId: data.partnerId,
            targetUserId: commitment.userId,
            title: 'Proof Needs Revision',
            body: `Your proof for "${action?.title}" was rejected.${reasonText}${(data as any).partnerNotes ? ` Note: ${(data as any).partnerNotes}` : ''} Please resubmit.`,
            data: {
              commitmentId: commitment.id.toString(),
              proofId: proof.id.toString(),
              actionTitle: action?.title,
              rejectionReason: data.rejectionReason,
              partnerNotes: (data as any).partnerNotes,
              purpose: 'proof_rejected'
            },
          });
        } catch (error) {
          console.error('Failed to send proof rejection notification:', error);
        }
        
        // Resume deadline reminders
        // TODO: Restart deadline reminder schedule (implement with cron job)
        
        const response: IVerifyProofResponse = {
          success: true,
          message: 'Proof rejected. User notified to resubmit.',
          data: {
            commitmentId: commitment.id,
            proofId: proof.id,
            status: commitment.status,
            rejectionReason: data.rejectionReason,
            timeRemaining: `${hoursRemaining} hours`,
            resubmitDeadline: deadline.toISOString(),
          },
        };

        return response;
      }
    }

  /**
   * Get user service statistics
   */
  async getUserServiceStats(userId: number, timeframe?: string): Promise<IServiceStatsResponse> {
    // Get or create stats
    let stats = await UserServiceStats.findOne({ where: { userId } });
    if (!stats) {
      stats = await UserServiceStats.create({
        userId,
        totalServiceHours: 0,
        totalMoneyDonated: 0,
        totalActionsCompleted: 0,
        redemptionStreak: 0,
        longestRedemptionStreak: 0,
      });
    }

    // Get breakdown by category
    const categoryBreakdown = await Commitment.findAll({
      where: {
        userId,
        status: CommitmentStatus.ACTION_COMPLETED,
      },
      include: [{ model: Action, as: 'action' }],
    });

    const byCategory: { [key: string]: { hours: number; count: number } } = {};
    categoryBreakdown.forEach((commitment) => {
      const action = (commitment as any).action;
      if (action) {
        const category = action.category;
        if (!byCategory[category]) {
          byCategory[category] = { hours: 0, count: 0 };
        }
        byCategory[category].hours += Number(action.estimatedHours);
        byCategory[category].count += 1;
      }
    });

    // Get monthly breakdown
    const monthlyData = await Commitment.findAll({
      where: {
        userId,
        status: CommitmentStatus.ACTION_COMPLETED,
        actionCompletedAt: {
          [Op.ne]: null,
        } as any,
      },
      include: [{ model: Action, as: 'action' }],
      order: [['actionCompletedAt', 'DESC']],
    });

    const byMonth: { [key: string]: { hours: number; count: number } } = {};
    monthlyData.forEach((commitment) => {
      const action = (commitment as any).action;
      if (action && commitment.actionCompletedAt) {
        const month = commitment.actionCompletedAt.toISOString().slice(0, 7);
        if (!byMonth[month]) {
          byMonth[month] = { hours: 0, count: 0 };
        }
        byMonth[month].hours += Number(action.estimatedHours);
        byMonth[month].count += 1;
      }
    });

    // Get recent actions
    const recentCommitments = await Commitment.findAll({
      where: {
        userId,
        status: CommitmentStatus.ACTION_COMPLETED,
      },
      include: [
        { model: Action, as: 'action' },
        {
          model: ActionProof,
          as: 'proofs',
          where: { partnerApproved: true },
          required: false,
        },
      ],
      order: [['actionCompletedAt', 'DESC']],
      limit: 10,
    });

    const recentActions = await Promise.all(
      recentCommitments.map(async (commitment) => {
        const action = (commitment as any).action;
        const proofs = (commitment as any).proofs || [];
        const latestProof = proofs[0];

        let verifierName = '';
        if (latestProof && latestProof.verifiedBy) {
          const verifier = await User.findByPk(latestProof.verifiedBy);
          verifierName = verifier ? `${verifier.firstName} ${verifier.lastName}` : '';
        }

        return {
          actionId: action?.id || 0,
          title: action?.title || commitment.customActionDescription || 'Custom Action',
          completedAt: commitment.actionCompletedAt?.toISOString() || '',
          hours: action ? Number(action.estimatedHours) : 1,
          proofThumbnail: latestProof?.thumbnailUrl,
          verifiedBy: verifierName,
          userNotes: latestProof?.userNotes,
        };
      })
    );

    const response: IServiceStatsResponse = {
      success: true,
      data: {
        userId,
        stats: {
          totalServiceHours: Number(stats.totalServiceHours),
          totalMoneyDonated: stats.totalMoneyDonated,
          totalActionsCompleted: stats.totalActionsCompleted,
          redemptionStreak: stats.redemptionStreak,
          longestRedemptionStreak: stats.longestRedemptionStreak,
        },
        breakdown: {
          byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category: category as ActionCategory,
            hours: data.hours,
            count: data.count,
          })),
          byMonth: Object.entries(byMonth).map(([month, data]) => ({
            month,
            hours: data.hours,
            count: data.count,
          })),
        },
        recentActions,
        badges: [],
      },
    };

    return response;
  }

  /**
   * Get redemption wall (public feed)
   */
  async getRedemptionWall(
    limit: number = 20,
    offset: number = 0,
    category?: ActionCategory,
    sortBy: string = 'recent'
  ): Promise<IRedemptionWallResponse> {
    const where: any = { isVisible: true };

    // Build query
    const order: any = sortBy === 'most_encouraged' ? [['encouragementCount', 'DESC']] : [['createdAt', 'DESC']];

    const includeOptions: any = [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
      { model: Action, as: 'action' },
      { model: ActionProof, as: 'proof' },
    ];

    if (category) {
      includeOptions[1].where = { category };
    }

    const { rows, count } = await RedemptionWall.findAndCountAll({
      where,
      include: includeOptions,
      order,
      limit,
      offset,
    });

    const redemptions = rows.map((item) => {
      const user = (item as any).user;
      const action = (item as any).action;
      const proof = (item as any).proof;

      const redemption: any = {
        id: item.id,
        commitmentId: item.commitmentId,
        user: {
          displayName: item.isAnonymous ? 'Anonymous User' : `${user.firstName} ${user.lastName}`,
          isAnonymous: item.isAnonymous,
        },
        action: {
          title: action.title,
          category: action.category,
          hours: Number(action.estimatedHours),
        },
        completedAt: item.createdAt.toISOString(),
        stats: {
          encouragements: item.encouragementCount,
          comments: item.commentCount,
        },
      };

      if (proof) {
        redemption.proofMedia = {
          thumbnailUrl: proof.thumbnailUrl || proof.mediaUrl,
          type: proof.mediaType,
        };
      }

      if (item.userReflection) {
        redemption.reflection = item.userReflection;
      }

      return redemption;
    });

    const response: IRedemptionWallResponse = {
      success: true,
      data: {
        redemptions,
        pagination: {
          total: count,
          hasMore: offset + limit < count,
          nextOffset: offset + limit,
        },
      },
    };

    return response;
  }

  /**
   * Check for overdue commitments (called by cron job)
   */
  async checkOverdueCommitments(): Promise<void> {
    const now = new Date();

    const overdueCommitments = await Commitment.findAll({
      where: {
        status: CommitmentStatus.ACTION_PENDING,
        actionDeadline: {
          [Op.lt]: now,
        },
      },
      include: [{ model: User, as: 'user' }],
    });

    for (const commitment of overdueCommitments) {
      await commitment.update({ status: CommitmentStatus.ACTION_OVERDUE });

      // Send notification to user
      // TODO: Send overdue notification

      // Update redemption streak (breaks streak)
      const stats = await UserServiceStats.findOne({ where: { userId: commitment.userId } });
      if (stats && stats.redemptionStreak > 0) {
        await stats.update({ redemptionStreak: 0 });
      }
    }

    console.log(`Processed ${overdueCommitments.length} overdue commitments`);
  }

  /**
   * Auto-approve proofs that have been pending for 24+ hours without partner verification
   */
  async autoApproveProofs(): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingCommitments = await Commitment.findAll({
      where: {
        status: CommitmentStatus.ACTION_PROOF_SUBMITTED,
        requirePartnerVerification: false,
      },
      include: [
        {
          model: ActionProof,
          as: 'proofs',
          where: {
            submittedAt: {
              [Op.lt]: twentyFourHoursAgo,
            },
            partnerApproved: null,
            isSuperseded: false,
          },
        },
      ],
    });

    for (const commitment of pendingCommitments) {
      const proofs: any = (commitment as any).proofs || [];
      if (proofs.length > 0) {
        const proof = proofs[0];
        await this.verifyProof(commitment.id, {
          partnerId: commitment.userId, // Auto-approve uses user ID
          proofId: proof.id,
          approved: true,
        });
      }
    }

    console.log(`Auto-approved ${pendingCommitments.length} proofs`);
  }

  /**
   * Get list of all available actions
   */
  async getActions(category?: ActionCategory, difficulty?: string): Promise<Action[]> {
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    return await Action.findAll({
      where,
      order: [['title', 'ASC']],
    });
  }

  /**
   * Get a specific action by ID
   */
  async getActionById(actionId: number): Promise<Action | null> {
    return await Action.findOne({
      where: { id: actionId, isActive: true },
    });
  }

  /**
   * Get user's commitments
   */
  async getUserCommitments(userId: number, status?: CommitmentStatus): Promise<Commitment[]> {
    const where: any = { userId };
    if (status) where.status = status;

    return await Commitment.findAll({
      where,
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'partner', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get a specific commitment by ID
   */
  async getCommitmentById(commitmentId: number): Promise<Commitment | null> {
    return await Commitment.findByPk(commitmentId, {
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'partner', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });
  }

  /**
   * Get commitments where user is a partner (for verification)
   */
  async getPartnerVerificationRequests(partnerId: number): Promise<Commitment[]> {
    return await Commitment.findAll({
      where: {
        partnerId,
        status: CommitmentStatus.ACTION_PROOF_SUBMITTED,
      },
      include: [
        { model: Action, as: 'action' },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
        {
          model: ActionProof,
          as: 'proofs',
          where: { isSuperseded: false },
          required: false,
        },
      ],
      order: [['updatedAt', 'DESC']],
    });
  }

  /**
   * Process charity payment when user fails commitment
   */
  private async processCharityPayment(
    commitmentId: number,
    userId: number,
    charityId: number,
    amount: number
  ): Promise<void> {
    try {
      // Get user details for payment processing
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName', 'lastName', 'email']
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get charity details
      const charity = await CharityOrganization.findByPk(charityId);
      if (!charity) {
        throw new Error('Charity organization not found');
      }

      // Create payment intent through charity service
      const paymentResult = await charityPaymentService.createPaymentIntent({
        amount,
        currency: 'usd',
        userId,
        commitmentId,
        charityId,
        metadata: {
          donorName: `${user.firstName} ${user.lastName}`,
          purpose: 'commitment_failure_donation'
        }
      });

      // Update commitment to reflect payment processed
      await Commitment.update(
        { financialPaidAt: new Date() },
        { where: { id: commitmentId } }
      );

      console.log(`Charity payment processed for commitment ${commitmentId}:`, paymentResult);

    } catch (error) {
      console.error(`Failed to process charity payment for commitment ${commitmentId}:`, error);
      throw error;
    }
  }

  /**
   * Build response for financial-only commitment completion
   */
  private buildFinancialCompletionResponse(commitment: Commitment): IReportRelapseResponse {
    return {
      success: true,
      message: 'Payment processed successfully. Your commitment has been completed.',
      data: {
        commitmentId: commitment.id,
        status: commitment.status,
      },
    };
  }
}

export default new CommitmentService();

// Add association after Commitment is defined
Commitment.hasMany(ActionProof, { foreignKey: 'commitmentId', as: 'proofs' });
