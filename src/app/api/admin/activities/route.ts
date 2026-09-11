import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { createActivity, getActivities, logSystemEvent } from '@/lib/firestore';
import { createActivityFolderInDrive } from '@/lib/drive';
import { getQuarterFromMonth } from '@/lib/sabbath';
import { ActivityItem, ArchiveCategory } from '@/lib/types';



export async function GET() {
  try {
    const activities = await getActivities();
    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error('API get activities error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);

    if (!authResult.authorized) {
      if (authResult.status === 'unauthenticated') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Sesi autentikasi diperlukan' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hanya Admin yang dapat membuat kegiatan baru' },
        { status: 403 }
      );
    }

    const { session } = authResult;

    const body = await req.json();
    const { title, date, category } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: 'Title and date are required' }, { status: 400 });
    }

    const [yStr, mStr] = date.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const quarter = getQuarterFromMonth(month);
    const actualCategory = (category as ArchiveCategory) || 'documentation';

    // Create the actual folder in Google Drive
    let driveFolder;
    try {
      driveFolder = await createActivityFolderInDrive(title, year, quarter, actualCategory);
    } catch (e: unknown) {
      console.error('Failed to create folder in Google Drive:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json({ success: false, error: `Gagal membuat folder di Google Drive: ${msg}` }, { status: 500 });
    }

    const activity: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      date,
      year,
      quarter,
      category: actualCategory,
      createdBy: session?.email || 'admin@gmahk-galilea.org',
      createdAt: new Date().toISOString(),
      folderId: driveFolder.folderId, // Store the actual Google Drive folder ID
    };

    await createActivity(activity);

    await logSystemEvent({
      type: 'AUTOMATION', // Admin action affecting Drive structure
      message: `Folder kegiatan dibuat: "${title}" (${driveFolder.folderPath})`,
      userId: session?.uid,
    });

    return NextResponse.json({
      success: true,
      message: 'Folder kegiatan berhasil ditambahkan ke Google Drive',
      data: activity,
    });
  } catch (error) {
    console.error('API create activity error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
