import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IAction, ActionCategory, ActionDifficulty } from '../types/commitment';

interface ActionCreationAttributes extends Optional<IAction, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class Action extends Model<IAction, ActionCreationAttributes> implements IAction {
  public id!: number;
  public title!: string;
  public description!: string;
  public category!: ActionCategory;
  public difficulty!: ActionDifficulty;
  public estimatedHours!: number;
  public proofInstructions!: string;
  public requiresLocation!: boolean;
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Action.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(ActionCategory)),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM(...Object.values(ActionDifficulty)),
      allowNull: false,
      defaultValue: ActionDifficulty.MEDIUM,
    },
    estimatedHours: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 1.0,
    },
    proofInstructions: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    requiresLocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'actions',
    timestamps: true,
    indexes: [
      {
        name: 'idx_category',
        fields: ['category'],
      },
      {
        name: 'idx_difficulty',
        fields: ['difficulty'],
      },
      {
        name: 'idx_active',
        fields: ['is_active'],
      },
    ],
  }
);

export default Action;
