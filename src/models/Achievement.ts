import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type AchievementCategory = 'streak' | 'prayer' | 'victory' | 'comment' | 'engagement';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface IAchievement {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: Record<string, any>; // JSON descriptor of unlocking criteria
  points?: number | null;
  icon?: string | null;
  scriptureRef?: string | null;
  blessingText?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type AchievementCreation = Optional<
  IAchievement,
  'id' | 'description' | 'points' | 'icon' | 'scriptureRef' | 'blessingText' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class Achievement extends Model<IAchievement, AchievementCreation> implements IAchievement {
  public id!: number;
  public code!: string;
  public title!: string;
  public description!: string | null;
  public category!: AchievementCategory;
  public tier!: AchievementTier;
  public requirement!: Record<string, any>;
  public points!: number | null;
  public icon!: string | null;
  public scriptureRef!: string | null;
  public blessingText!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Achievement.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(100), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  // Use STRING instead of ENUM to avoid migration issues with existing data
  category: { type: DataTypes.STRING(50), allowNull: false },
    tier: { type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'), allowNull: false, defaultValue: 'bronze' },
    requirement: { type: DataTypes.JSON, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: true },
    icon: { type: DataTypes.STRING(255), allowNull: true },
    scriptureRef: { type: DataTypes.STRING(255), allowNull: true, field: 'scripture_ref' },
    blessingText: { type: DataTypes.TEXT, allowNull: true, field: 'blessing_text' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'Achievement',
    tableName: 'achievements',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['code'] }],
  }
);

export default Achievement;


