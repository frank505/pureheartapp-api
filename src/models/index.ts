/**
 * Models index file
 * This file exports all database models and initializes associations
 */

import sequelize from '../config/database';
import User from './User';
import OnboardingData from './OnboardingData';
import AccountabilityPartner from './AccountabilityPartner';
import InvitationClick from './InvitationClick';
import Group from './Group';
import GroupMember from './GroupMember';
import GroupInvite from './GroupInvite';
import GroupJoinRequest from './GroupJoinRequest';
import Message from './Message';
import MessageAttachment from './MessageAttachment';
import MessageRead from './MessageRead';
import GeneralSetting from './GeneralSetting';
import Notification from './Notification';
import AccountabilityCheckIn from './AccountabilityCheckIn';
import PrayerRequest from './PrayerRequest';
import Victory from './Victory';
import AccountabilityComment from './AccountabilityComment';
import DailyRecommendation from './DailyRecommendation';
import Achievement from './Achievement';
import UserAchievement from './UserAchievement';
import UserProgress from './UserProgress';
import TruthLies from './TruthLies';
import AIChatSession from './AIChatSession';
import AIChatMessage from './AIChatMessage';
import Badge from './Badge';
import UserBadge from './UserBadge';
import Fast from './Fast';
import FastPrayerLog from './FastPrayerLog';
import FastProgressLog from './FastProgressLog';
import FastReminderLog from './FastReminderLog';
import FastJournal from './FastJournal';
import DeviceToken from './DeviceToken';

User.hasOne(OnboardingData, {
  foreignKey: 'userId',
  as: 'onboardingData',
});

OnboardingData.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Recommendation associations
User.hasMany(DailyRecommendation, {
  foreignKey: 'userId',
  as: 'dailyRecommendations',
});

DailyRecommendation.belongsTo(User, {
  foreignKey: 'userId',
  as: 'recommendedUser',
});

// Fast associations
User.hasMany(Fast, { foreignKey: 'userId', as: 'fasts' });
Fast.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Fast.hasMany(FastPrayerLog, { foreignKey: 'fastId', as: 'prayers' });
Fast.hasMany(FastProgressLog, { foreignKey: 'fastId', as: 'progressLogs' });
Fast.hasMany(FastJournal, { foreignKey: 'fastId', as: 'journals' });
FastPrayerLog.belongsTo(Fast, { foreignKey: 'fastId', as: 'fast' });
FastProgressLog.belongsTo(Fast, { foreignKey: 'fastId', as: 'fast' });
FastJournal.belongsTo(Fast, { foreignKey: 'fastId', as: 'fast' });
FastPrayerLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
FastProgressLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
FastJournal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Device tokens
User.hasMany(DeviceToken, { foreignKey: 'userId', as: 'deviceTokens' });
DeviceToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// A user can send many accountability invitations
User.hasMany(AccountabilityPartner, {
  foreignKey: 'userId',
  as: 'sentInvitations',
});

// An accountability invitation is sent by one user
AccountabilityPartner.belongsTo(User, {
  foreignKey: 'userId',
  as: 'sender',
});

// A user can be an accountability partner for one invitation
User.hasOne(AccountabilityPartner, {
  foreignKey: 'receiverId',
  as: 'accountabilityPartner',
});

// An accountability invitation is received by one user
AccountabilityPartner.belongsTo(User, {
  foreignKey: 'receiverId',
  as: 'receiver',
});

// An accountability invitation can have multiple clicks
AccountabilityPartner.hasMany(InvitationClick, {
    foreignKey: 'invitationId',
    as: 'clicks',
});

InvitationClick.belongsTo(AccountabilityPartner, {
    foreignKey: 'invitationId',
    as: 'invitation',
});

// A user can have many victories
User.hasMany(Victory, {
  foreignKey: 'userId',
  as: 'victories',
});

// A victory belongs to one user
Victory.belongsTo(User, {
  foreignKey: 'userId',
  as: 'victoriousUser',
});

Victory.belongsToMany(Group, {
  through: 'victory_groups',
  foreignKey: 'victoryId',
  otherKey: 'groupId',
  as: 'groups',
});

Group.belongsToMany(Victory, {
  through: 'victory_groups',
  foreignKey: 'groupId',
  otherKey: 'victoryId',
  as: 'victories',
});

// A user can have many prayer requests
User.hasMany(PrayerRequest, {
  foreignKey: 'userId',
  as: 'prayerRequests',
});

// A prayer request belongs to one user
PrayerRequest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'requestingUser',
});

PrayerRequest.belongsToMany(Group, {
  through: 'prayer_request_groups',
  foreignKey: 'prayerRequestId',
  otherKey: 'groupId',
  as: 'groups',
});

Group.belongsToMany(PrayerRequest, {
  through: 'prayer_request_groups',
  foreignKey: 'groupId',
  otherKey: 'prayerRequestId',
  as: 'prayerRequests',
});

// Accountability comments associations
// A user can write many accountability comments
User.hasMany(AccountabilityComment, {
  foreignKey: 'userId',
  as: 'comments',
});

// Each accountability comment belongs to a single user (author)
AccountabilityComment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Badges associations
// A user can have many user-badges (awarded badges)
User.hasMany(UserBadge, {
  foreignKey: 'userId',
  as: 'userBadges',
});

UserBadge.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// A badge can have many user-badges
Badge.hasMany(UserBadge, {
  foreignKey: 'badgeId',
  as: 'awarded',
});

UserBadge.belongsTo(Badge, {
  foreignKey: 'badgeId',
  as: 'badge',
});

// Export all models
export {
  sequelize,
  User,
  OnboardingData,
  AccountabilityPartner,
  InvitationClick,
  Group,
  GroupMember,
  GroupInvite,
  GroupJoinRequest,
  Message,
  MessageAttachment,
  MessageRead,
  GeneralSetting,
  Notification,
  AccountabilityCheckIn,
  PrayerRequest,
  Victory,
  AccountabilityComment,
  DailyRecommendation,
  Achievement,
  UserAchievement,
  UserProgress,
  TruthLies,
  AIChatSession,
  AIChatMessage,
  Badge,
  UserBadge,
  Fast,
  FastPrayerLog,
  FastProgressLog,
  FastReminderLog,
  FastJournal,
  DeviceToken,
};

// Export a function to sync all models
export const syncAllModels = async (force: boolean = false, alter: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter });
    console.log('All models synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    throw error;
  }
};

export default {
  User,
  sequelize,
  syncAllModels,
  AccountabilityPartner,
  InvitationClick,
  Group,
  GroupMember,
  GroupInvite,
  GroupJoinRequest,
  Message,
  MessageAttachment,
  MessageRead,
  GeneralSetting,
  Notification,
  AccountabilityCheckIn,
  PrayerRequest,
  Victory,
  AccountabilityComment,
  Achievement,
  UserAchievement,
  UserProgress,
  Badge,
  UserBadge,
  Fast,
  FastPrayerLog,
  FastProgressLog,
  FastReminderLog,
  DeviceToken,
};