import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { isFileInManagedArchive } from '@/lib/drive';
import { requireAdmin } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ success: false, error: 'Firestore error' }, { status: 500 });

    const snapshot = await db.collection('fileIndex')
      .where('isRandomEligible', '==', true)
      .get();

    const results = {
      scanned: snapshot.docs.length,
      invalidated: 0,
      errors: 0,
    };

    for (const doc of snapshot.docs) {
      try {
        const fileId = doc.id;
        const isManaged = await isFileInManagedArchive(fileId);
        if (!isManaged) {
          await doc.ref.update({ isRandomEligible: false });
          results.invalidated++;
        }
      } catch (err) {
        console.error('Error reconciling file:', doc.id, err);
        results.errors++;
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    console.error('Reconcile error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
