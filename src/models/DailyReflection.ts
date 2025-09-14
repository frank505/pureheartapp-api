import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface IDailyReflection {
  id: number;
  userId: number;
  displayDate: string; // YYYY-MM-DD in user's local timezone
  orderInDay: number; // 1..5
  title?: string | null;
  body: string;
  scriptureReference?: string | null;
  scriptureText?: string | null;
  context?: Record<string, any> | null; // generation inputs
  createdAt?: Date;
  updatedAt?: Date;
}

type DailyReflectionCreation = Optional<IDailyReflection, 'id' | 'title' | 'scriptureReference' | 'scriptureText' | 'context'>;

class DailyReflection extends Model<IDailyReflection, DailyReflectionCreation> implements IDailyReflection {
  public id!: number;
  public userId!: number;
  public displayDate!: string;
  public orderInDay!: number;
  public title!: string | null;
  public body!: string;
  public scriptureReference!: string | null;
  public scriptureText!: string | null;
  public context!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DailyReflection.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: User, key: 'id' }, field: 'user_id' },
    displayDate: { type: DataTypes.STRING(10), allowNull: false, field: 'display_date', comment: 'YYYY-MM-DD (user local date when to show)'},
    orderInDay: { type: DataTypes.INTEGER, allowNull: false, field: 'order_in_day', comment: '1..5 order within the day' },
    title: { type: DataTypes.STRING(255), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: false },
    scriptureReference: { type: DataTypes.STRING(255), allowNull: true, field: 'scripture_reference' },
    scriptureText: { type: DataTypes.TEXT, allowNull: true, field: 'scripture_text' },
    context: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'DailyReflection',
    tableName: 'daily_reflections',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'display_date', 'order_in_day'] },
      { fields: ['user_id', 'display_date'] },
    ],
  }
);

DailyReflection.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default DailyReflection;
