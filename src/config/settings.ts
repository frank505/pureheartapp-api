import GeneralSetting from '../models/GeneralSetting';

export const GENERAL_SETTING_KEYS = {
  ENABLE_PUSH_NOTIFICATIONS: 'enable_push_notifications',
  WEEKLY_EMAIL_NOTIFICATIONS: 'weekly_email_notifications',
} as const;

export type GeneralSettingKey = typeof GENERAL_SETTING_KEYS[keyof typeof GENERAL_SETTING_KEYS];

export const initializeGeneralSettings = async (): Promise<void> => {
  const defaults: Record<GeneralSettingKey, string> = {
    [GENERAL_SETTING_KEYS.ENABLE_PUSH_NOTIFICATIONS]: 'false',
    [GENERAL_SETTING_KEYS.WEEKLY_EMAIL_NOTIFICATIONS]: 'false',
  } as const;

  await Promise.all(
    Object.entries(defaults).map(([key, value]) =>
      GeneralSetting.findOrCreate({ where: { key }, defaults: { key, value } })
    )
  );
};

export const getBooleanSetting = async (key: GeneralSettingKey, defaultValue = false): Promise<boolean> => {
  return GeneralSetting.getBoolean(key, defaultValue);
};

export const setBooleanSetting = async (key: GeneralSettingKey, value: boolean): Promise<void> => {
  await GeneralSetting.setValue(key, value ? 'true' : 'false');
};


