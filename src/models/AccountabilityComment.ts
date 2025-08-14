import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type CommentTargetType = 'checkin' | 'prayer_request' | 'victory';

export interface IAccountabilityComment {
  id: number; // uuid
  userId: number; // author
  targetType: CommentTargetType;
  targetId: number; // UUID of target entity
  body: string;
  mentions?: number[] | null; // userId strings
  attachments?: Array<{ type: string; url: string; name?: string | null }> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type AccountabilityCommentCreation = Optional<
  IAccountabilityComment,
  'id' | 'mentions' | 'attachments' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class AccountabilityComment
  extends Model<IAccountabilityComment, AccountabilityCommentCreation>
  implements IAccountabilityComment
{
  public id!: number;
  public userId!: number;
  public targetType!: CommentTargetType;
  public targetId!: number;
  public body!: string;
  public mentions!: number[] | null;
  public attachments!: Array<{ type: string; url: string; name?: string | null }> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

AccountabilityComment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    targetType: { type: DataTypes.ENUM('checkin', 'prayer_request', 'victory'), allowNull: false },
    targetId: { type: DataTypes.INTEGER, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    mentions: { type: DataTypes.JSON, allowNull: true },
    attachments: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AccountabilityComment',
    tableName: 'accountability_comments',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['target_id', 'target_type', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
    ],
  }
);

export default AccountabilityComment;


