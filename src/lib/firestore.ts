import { getAdminFirestore } from './firebase-admin';
import { ActivityItem, ArchiveCategory, FileItem, SystemLog, AutomationStatus } from './types';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getDriveAuthInfo } from './drive';

/**
 * Indexes a new file in Firestore
 */
export async function indexFile(file: FileItem): Promise<void> {
  const db = getAdminFirestore();
  if (db) {
    await db.collection('fileIndex').doc(file.id).set(file);
  } else {
    throw new Error('Firestore is not initialized');
  }
}

/**
 * Retrieves files for a specific Sabbath and category
 */
export async function getFilesBySabbath(
  sabbathDate: string,
  category?: ArchiveCategory
): Promise<FileItem[]> {
  try {
    const db = getAdminFirestore();
    if (db) {
      let query: Query = db
        .collection('fileIndex')
        .where('sabbathDate', '==', sabbathDate);
      if (category) {
        query = query.where('category', '==', category);
      }
      const snap = await query.get();
      if (!snap.empty) {
        return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as FileItem);
      }
    }
  } catch (err) {
    console.error('Firestore getFilesBySabbath failed:', err);
  }
  return [];
}

/**
 * Retrieves random photos and videos for the homepage without scanning all of Drive
 */
export async function getRandomArchiveSample(limitCount: number = 6): Promise<FileItem[]> {
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db
        .collection('fileIndex')
        .where('isRandomEligible', '==', true)
        .limit(limitCount * 2)
        .get();
      const all = snap.docs.map((d: QueryDocumentSnapshot) => d.data() as FileItem);
      if (all.length > 0) {
        // Shuffle array
        return all.sort(() => 0.5 - Math.random()).slice(0, limitCount);
      }
    }
  } catch (err) {
    console.error('Firestore getRandomArchiveSample failed:', err);
  }
  return [];
}

/**
 * Creates and records a new activity
 */
export async function createActivity(activity: ActivityItem): Promise<void> {
  try {
    const db = getAdminFirestore();
    if (db) {
      await db.collection('activities').doc(activity.id).set(activity);
    } else {
      throw new Error('Firestore is not initialized');
    }
  } catch (err) {
    console.error('Firestore createActivity failed:', err);
    throw err;
  }
}

/**
 * Lists activities
 */
export async function getActivities(): Promise<ActivityItem[]> {
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection('activities').orderBy('createdAt', 'desc').limit(20).get();
      if (!snap.empty) {
        return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as ActivityItem);
      }
    }
  } catch (err) {
    console.error('Firestore getActivities failed:', err);
  }
  return [];
}

/**
 * Logs an administrative or security event
 */
export async function logSystemEvent(log: Omit<SystemLog, 'id' | 'timestamp'>): Promise<void> {
  const entry: SystemLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const db = getAdminFirestore();
    if (db) {
      await db.collection('systemLogs').doc(entry.id).set(entry);
    }
  } catch (err) {
    console.error('Firestore logSystemEvent failed:', err);
  }
}

/**
 * Retrieves recent system audit logs
 */
export async function getSystemLogs(limitCount: number = 20): Promise<SystemLog[]> {
  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection('systemLogs').orderBy('timestamp', 'desc').limit(limitCount).get();
      if (!snap.empty) {
        return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as SystemLog);
      }
    }
  } catch (err) {
    console.error('Firestore getSystemLogs failed:', err);
  }
  return [];
}

/**
 * Retrieves automation status
 */
export async function getAutomationStatus(): Promise<AutomationStatus> {
  try {
    const db = getAdminFirestore();
    if (db) {
      const doc = await db.collection('automationStatus').doc('latest').get();
      if (doc.exists) {
        return doc.data() as AutomationStatus;
      }
    }
  } catch (err) {
    console.error('Firestore getAutomationStatus failed:', err);
  }

  const driveInfo = getDriveAuthInfo();
  if (!driveInfo.isAuthenticated) {
    return {
      lastRun: new Date().toISOString(),
      status: 'AUTHENTICATION_REQUIRED',
      details: 'Google Drive belum terhubung. Silakan hubungkan akun Google terlebih dahulu.',
      createdFoldersCount: 0,
    };
  }

  return {
    lastRun: new Date().toISOString(),
    status: 'READY',
    details: `Google Drive terhubung (${driveInfo.targetStorage}). Otomasi siap dijalankan.`,
    createdFoldersCount: 0,
  };
}
