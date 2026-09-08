import { getAdminFirestore } from './firebase-admin';
import { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FileItem, ActivityItem, SystemLog, AutomationStatus, ArchiveCategory } from './types';
import { getDriveAuthInfo } from './drive';

// In-memory mock storage for local development & demonstration before Firestore credentials are populated
const mockFiles: FileItem[] = [
  {
    id: 'sample-doc-1',
    name: 'Dokumentasi Sabat Pembukaan 2026.jpg',
    mimeType: 'image/jpeg',
    size: 2450000,
    category: 'documentation',
    fileType: 'photo',
    sabbathDate: '2026-09-05',
    sabbathTitle: '5 September 2026',
    year: 2026,
    quarter: 3,
    folderId: 'folder-sab-1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80',
    webViewLink: 'https://drive.google.com/file/d/sample-doc-1/view',
    uploadedAt: '2026-09-05T14:30:00Z',
    isRandomEligible: true,
  },
  {
    id: 'sample-doc-2',
    name: 'Pelayanan Pujian Jemaat.mp4',
    mimeType: 'video/mp4',
    size: 15400000,
    category: 'documentation',
    fileType: 'video',
    sabbathDate: '2026-09-05',
    sabbathTitle: '5 September 2026',
    year: 2026,
    quarter: 3,
    folderId: 'folder-sab-1',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    webViewLink: 'https://drive.google.com/file/d/sample-doc-2/view',
    uploadedAt: '2026-09-05T15:10:00Z',
    isRandomEligible: true,
  },
  {
    id: 'sample-worship-1',
    name: 'Tata Ibadah Sabat 12 September 2026.pdf',
    mimeType: 'application/pdf',
    size: 1240000,
    category: 'worship',
    fileType: 'pdf',
    sabbathDate: '2026-09-12',
    sabbathTitle: '12 September 2026',
    year: 2026,
    quarter: 3,
    folderId: 'folder-sab-2',
    webViewLink: 'https://drive.google.com/file/d/sample-worship-1/view',
    uploadedAt: '2026-09-07T10:00:00Z',
    isRandomEligible: false,
  },
  {
    id: 'sample-worship-2',
    name: 'Slide Khotbah - Kasih Yang Menyelamatkan.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 4800000,
    category: 'worship',
    fileType: 'presentation',
    sabbathDate: '2026-09-12',
    sabbathTitle: '12 September 2026',
    year: 2026,
    quarter: 3,
    folderId: 'folder-sab-2',
    webViewLink: 'https://drive.google.com/file/d/sample-worship-2/view',
    uploadedAt: '2026-09-07T11:20:00Z',
    isRandomEligible: false,
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'KKR Pemuda Galilea - 19 September 2026',
    date: '2026-09-19',
    year: 2026,
    quarter: 3,
    category: 'documentation',
    createdBy: 'admin@gmahk-galilea.org',
    createdAt: '2026-09-07T12:00:00Z',
  },
];

const mockLogs: SystemLog[] = [
  {
    id: 'log-1',
    type: 'AUTOMATION',
    message: 'Struktur folder Sabat Triwulan III 2026 berhasil diverifikasi',
    timestamp: '2026-09-07T08:00:00Z',
  },
];

/**
 * Indexes a new file in Firestore
 */
export async function indexFile(file: FileItem): Promise<void> {
  const db = getAdminFirestore();
  if (db) {
    await db.collection('fileIndex').doc(file.id).set(file);
  } else {
    mockFiles.unshift(file);
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
    console.warn('Firestore getFilesBySabbath failed, falling back to mock:', err);
  }

  return mockFiles.filter((f) => {
    const matchSabbath = f.sabbathDate === sabbathDate;
    const matchCategory = category ? f.category === category : true;
    return matchSabbath && matchCategory;
  });
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
    console.warn('Firestore getRandomArchiveSample failed, falling back to mock:', err);
  }

  const eligible = mockFiles.filter((f) => f.isRandomEligible);
  return [...eligible].sort(() => 0.5 - Math.random()).slice(0, limitCount);
}

/**
 * Creates and records a new activity
 */
export async function createActivity(activity: ActivityItem): Promise<void> {
  try {
    const db = getAdminFirestore();
    if (db) {
      await db.collection('activities').doc(activity.id).set(activity);
      return;
    }
  } catch (err) {
    console.warn('Firestore createActivity failed, saving in memory:', err);
  }
  mockActivities.unshift(activity);
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
    console.warn('Firestore getActivities failed, falling back to mock:', err);
  }
  return mockActivities;
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
      return;
    }
  } catch (err) {
    console.warn('Firestore logSystemEvent failed, saving in memory:', err);
  }
  mockLogs.unshift(entry);
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
    console.warn('Firestore getSystemLogs failed, falling back to mock:', err);
  }
  return mockLogs.slice(0, limitCount);
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
    console.warn('Firestore getAutomationStatus failed, falling back to default:', err);
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
