import admin from 'firebase-admin';
import { appConfig } from '../config/environment';
import DeviceToken from '../models/DeviceToken';
import { Job } from 'bullmq';

let initialized = false;

export const initFirebaseIfNeeded = (job?: Job) => {
  job?.log('Initializing Firebase Admin');
  initialized ? job?.log('has been initialized') : job?.log('has not been initialized');
  if (initialized) return;
  const credsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credsJson) return; // allow running without push configured
  try {
    job?.log('Initializing Firebase Admin');
    // first convert from base64 to JSON
    const buffer = Buffer.from(credsJson, 'base64');
    const credentials = JSON.parse(buffer.toString('utf-8'));
    job?.log('firebase credentials: '+ JSON.stringify(credentials));
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    initialized = true;
    job?.log('✅ Firebase Admin initialized');
  } catch (e) {
    job?.log('Failed to initialize Firebase Admin: '+ JSON.stringify(e));
  }
};

export type PushOptions = {
  title: string;
  body?: string | undefined;
  data?: Record<string, string> | undefined;
};

export const sendPushToUser = async (userId: number, opts: PushOptions, job?:Job): Promise<boolean> => {
  initFirebaseIfNeeded(job);
  if (!initialized) return false;
  job?.log('has initialized firebase');
  const tokens = await DeviceToken.findAll({ where: { userId, isActive: true } });
  if (!tokens.length) return false;

  const messages = tokens.map(t => ({
    token: t.token,
    notification: { 
      title: opts.title, 
      body: opts.body || '' 
    },
    data: (opts.data as any) || {},
    android: { priority: 'high' as const },
    apns: {
      headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
      payload: { 
        aps: { 
          alert: { 
            title: opts.title, 
            body: opts.body || '' 
          }, 
          sound: 'default' 
        } 
      },
    },
  }));

  try {
    const res = await admin.messaging().sendEach(messages);
    job?.log('Push notification sent successfully');
    job?.log('Push notification responses: ' + JSON.stringify(res));
    const responses = res.responses || [];
    
    // Handle invalid tokens concurrently
    const invalidTokenPromises = responses
      .map(async (response, index) => {
        if (response.success) return;
        
        const errorCode = response.error?.code || '';
        const isInvalidToken = [
          'registration-token-not-registered',
          'invalid-registration-token',
          'messaging/registration-token-not-registered'
        ].some(code => errorCode.includes(code));
        
        if (!isInvalidToken) return;
        
        const tokenObj = tokens[index];
        if (!tokenObj) return;
        
        const dbToken = await DeviceToken.findOne({ 
          where: { token: tokenObj.token, userId } 
        });
        
        if (dbToken) {
          dbToken.isActive = false;
          await dbToken.save();
        }
      })
      .filter(Boolean);
    
    // Wait for all token deactivations to complete
    await Promise.allSettled(invalidTokenPromises);
    
    return true;
  } catch (error) {
    job?.log('Push error: ' + JSON.stringify(error));
    return false;
  }
};
