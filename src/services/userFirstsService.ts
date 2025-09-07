import UserFirsts from '../models/UserFirsts';

export const ensureUserFirsts = async (userId: number) => {
  const [row] = await UserFirsts.findOrCreate({ where: { userId }, defaults: { userId } });
  return row;
};

export const setFirstFlag = async (userId: number, flag: keyof Omit<UserFirsts, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  const row = await ensureUserFirsts(userId);
  if (!(row as any)[flag]) {
    (row as any)[flag] = true;
    await row.save();
  }
  return row;
};

export const getUserFirsts = async (userId: number) => {
  return ensureUserFirsts(userId);
};
