import admin from 'firebase-admin';
import { appConfig } from '../config/environment';
import DeviceToken from '../models/DeviceToken';

let initialized = false;

export const initFirebaseIfNeeded = () => {
  if (initialized) return;
  const credsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credsJson) return; // allow running without push configured
  try {
    const credentials = JSON.parse(credsJson);
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    initialized = true;
// eslint-disable-next-line no-console
    console.log('✅ Firebase Admin initialized');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Firebase Admin:', e);
  }
};

export type PushOptions = {
  title: string;
  body?: string | undefined;
  data?: Record<string, string> | undefined;
};

export const sendPushToUser = async (userId: number, opts: PushOptions) => {
  initFirebaseIfNeeded();
  if (!initialized) return false;
  const tokens = await DeviceToken.findAll({ where: { userId, isActive: true } });
  if (!tokens.length) return false;

  const messages = tokens.map(t => ({
    token: t.token,
    notification: { title: opts.title, body: opts.body },
    data: (opts.data as any) || {},
    android: { priority: 'high' },
    apns: {
  headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
      payload: { aps: { alert: { title: opts.title, body: opts.body }, sound: 'default' } },
    },
  }));

  try {
    const res = await (admin.messaging() as any).sendEach(messages);
    const responses: any[] = res.responses || [];
    // Deactivate invalid tokens
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      if (!r.success) {
        const errCode = r.error?.code || '';
        if (
          errCode.includes('registration-token-not-registered') ||
          errCode.includes('invalid-registration-token') ||
          errCode.includes('messaging/registration-token-not-registered')
        ) {
          const tokenObj = tokens[i];
          if (!tokenObj) continue;
          const tokenStr = tokenObj.token;
          const dbToken = await DeviceToken.findOne({ where: { token: tokenStr, userId } });
          if (dbToken) {
            (dbToken as any).isActive = false;
            await dbToken.save();
          }
        }
      }
    }
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Push error:', e);
    return false;
  }
};
