import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface IDailyRecommendation {
  id: number;
  userId: number;
  localDate: string;
  bibleVersion?: string | null;
  scriptureReference?: string | null;
  scriptureText?: string | null;
  youtubeVideoId?: string | null;
  youtubeTitle?: string | null;
  youtubeChannelId?: string | null;
  youtubeChannelTitle?: string | null;
  youtubeUrl?: string | null;
  queryContext?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type DailyRecommendationCreation = Optional<IDailyRecommendation, 'id'>;

class DailyRecommendation extends Model<IDailyRecommendation, DailyRecommendationCreation> implements IDailyRecommendation {
  public id!: number;
  public userId!: number;
  public localDate!: string;
  public bibleVersion!: string | null;
  public scriptureReference!: string | null;
  public scriptureText!: string | null;
  public youtubeVideoId!: string | null;
  public youtubeTitle!: string | null;
  public youtubeChannelId!: string | null;
  public youtubeChannelTitle!: string | null;
  public youtubeUrl!: string | null;
  public queryContext!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DailyRecommendation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: 'id' },
    },
    localDate: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Date string in YYYY-MM-DD for the user\'s timezone',
    },
    bibleVersion: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    scriptureReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    scriptureText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    youtubeVideoId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    youtubeTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    youtubeChannelId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    youtubeChannelTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    youtubeUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    queryContext: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'DailyRecommendation',
    tableName: 'daily_recommendations',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'local_date'] },
      { fields: ['user_id', 'youtube_video_id'] },
    ],
  }
);

DailyRecommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default DailyRecommendation;


