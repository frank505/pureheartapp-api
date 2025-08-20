import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface IBadge {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  tier?: BadgeTier | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type BadgeCreation = Optional<IBadge, 'id' | 'description' | 'icon' | 'tier' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class Badge extends Model<IBadge, BadgeCreation> implements IBadge {
  public id!: number;
  public code!: string;
  public title!: string;
  public description!: string | null;
  public icon!: string | null;
  public tier!: BadgeTier | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Badge.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(100), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
  icon: { type: DataTypes.STRING(1024), allowNull: true },
    tier: { type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'), allowNull: true, defaultValue: null },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'Badge',
    tableName: 'badges',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [{ unique: true, fields: ['code'] }],
  }
);

export default Badge;
