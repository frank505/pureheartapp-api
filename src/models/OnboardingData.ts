import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import { OnboardingState, PersonalInfo, AssessmentData, AdditionalAssessmentData, FaithData, HowTheyHeard, AccountabilityPreferences, RecoveryJourneyData } from '../types/auth';

// Interface for OnboardingData model attributes
export interface IOnboardingData extends OnboardingState {
  id: number;
  userId: number;
}

// Interface for OnboardingData creation attributes
interface OnboardingDataCreationAttributes extends Optional<IOnboardingData, 'id'> {}

class OnboardingData extends Model<IOnboardingData, OnboardingDataCreationAttributes> implements IOnboardingData {
  public id!: number;
  public userId!: number;
  public personalInfo!: Partial<PersonalInfo>;
  public assessmentData!: Partial<AssessmentData>;
  public additionalAssessmentData!: Partial<AdditionalAssessmentData>;
  public faithData!: Partial<FaithData>;
  public howTheyHeard!: Partial<HowTheyHeard>;
  public accountabilityPreferences!: Partial<AccountabilityPreferences>;
  public recoveryJourneyData!: Partial<RecoveryJourneyData>;
  public lastSaveTime!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OnboardingData.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    personalInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    assessmentData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    additionalAssessmentData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    faithData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    howTheyHeard: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    accountabilityPreferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    recoveryJourneyData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lastSaveTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'OnboardingData',
    tableName: 'onboarding_data',
    timestamps: true,
    underscored: true,
  }
);

export default OnboardingData;

