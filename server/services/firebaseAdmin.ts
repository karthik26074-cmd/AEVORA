import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName?: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

let firebaseAdminApp: App | null = null;
let isInitialized = false;

/**
 * Performs startup configuration check and initializes Firebase Admin SDK.
 * Logs whether each of the 8 variables is set WITHOUT printing any secret value.
 * Fails loudly with a clear message if Firebase Admin values are missing.
 */
export function performStartupCheck(): { success: boolean; missingAdminVars: string[] } {
  const varsToCheck = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'TOKEN_ENCRYPTION_KEY',
    'GITHUB_WEBHOOK_SECRET',
    'PUBLIC_WEBHOOK_URL',
    'DEMO_MODE',
    'EVENTS_DB_PATH',
  ];

  console.log('[STARTUP] ==================================================');
  console.log('[STARTUP] Configuration & Environment Variables Check:');

  for (const varName of varsToCheck) {
    const rawVal = process.env[varName];
    const isSet = Boolean(rawVal && rawVal.trim().length > 0);
    // Explicitly never print any secret value
    console.log(`[STARTUP]   ${varName}: ${isSet ? '[SET]' : '[NOT SET]'}`);
  }

  // Check required Firebase Admin variables
  const adminVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
  const missingAdminVars = adminVars.filter((v) => !process.env[v] || !process.env[v]!.trim());

  if (missingAdminVars.length > 0) {
    console.error('[STARTUP]   Firebase Admin initialized: [FAILED]');
    console.error('[STARTUP] ==================================================');
    const errorMsg =
      `[FATAL STARTUP ERROR] Firebase Admin initialization failed! Missing required credentials: ${missingAdminVars.join(
        ', '
      )}. The server requires Firebase Admin to securely verify Firebase ID tokens. Falling back to 'default-user' is strictly prohibited. Please provide all required Firebase Admin credentials.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!getApps().length) {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    } else {
      firebaseAdminApp = getApp();
    }

    isInitialized = true;
    console.log('[STARTUP]   Firebase Admin initialized: [SUCCESS]');
    console.log('[STARTUP] ==================================================');
    return { success: true, missingAdminVars: [] };
  } catch (err: any) {
    console.error(`[STARTUP]   Firebase Admin initialized: [FAILED] (${err.message})`);
    console.error('[STARTUP] ==================================================');
    const errorMsg = `[FATAL STARTUP ERROR] Firebase Admin failed to initialize with provided credentials: ${err.message}. Server cannot start without valid Firebase Admin credentials.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Authentication middleware:
 * Validates request strictly using a verified Firebase ID token from Authorization header.
 * The authenticated user is taken ONLY from the verified token, NEVER from a query parameter, body, or header.
 */
export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH] Missing or invalid Authorization header on ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid Authorization header. A valid Bearer Firebase ID token is required.',
      code: 'AUTH_TOKEN_REQUIRED',
    });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized: Bearer token is empty.',
      code: 'AUTH_TOKEN_EMPTY',
    });
  }

  if (!isInitialized || !firebaseAdminApp) {
    return res.status(500).json({
      error: 'Server configuration error: Firebase Admin is not initialized.',
      code: 'FIREBASE_ADMIN_UNINITIALIZED',
    });
  }

  try {
    const auth = getAuth(firebaseAdminApp);
    const decodedToken = await auth.verifyIdToken(idToken);
    // Take user ONLY from verified Firebase ID token (decodedToken.uid)
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      displayName: (decodedToken as any).name || '',
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: `Unauthorized: Firebase ID token verification failed (${err.message || 'invalid token'}).`,
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

export { firebaseAdminApp };
