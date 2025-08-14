import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IGeneralSetting {
  id: number;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type GeneralSettingCreationAttributes = Optional<IGeneralSetting, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class GeneralSetting extends Model<IGeneralSetting, GeneralSettingCreationAttributes> implements IGeneralSetting {
  public id!: number;
  public key!: string;
  public value!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date | null;

  public static async getValue(settingKey: string): Promise<string | null> {
    const record = await GeneralSetting.findOne({ where: { key: settingKey } });
    return record ? record.value : null;
  }

  public static async setValue(settingKey: string, settingValue: string): Promise<GeneralSetting> {
    const existing = await GeneralSetting.findOne({ where: { key: settingKey } });
    if (existing) {
      existing.value = settingValue;
      await existing.save();
      return existing;
    }
    return GeneralSetting.create({ key: settingKey, value: settingValue });
  }

  public static async getBoolean(settingKey: string, defaultValue: boolean = false): Promise<boolean> {
    const raw = await GeneralSetting.getValue(settingKey);
    if (raw === null || raw === undefined) return defaultValue;
    const normalized = String(raw).trim().toLowerCase();
    return ['true', '1', 'yes', 'y', 'on'].includes(normalized);
  }
}

GeneralSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(191), // 191 to be safe for MySQL index length with utf8mb4
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 191],
      },
    },
    value: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'GeneralSetting',
    tableName: 'general_settings',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['key'],
        name: 'idx_unique_general_settings_key',
      },
    ],
  }
);

export default GeneralSetting;


