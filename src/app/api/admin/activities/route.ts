import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { createActivity, getActivities, logSystemEvent } from '@/lib/firestore';
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
    const { authorized, session } = await requireAdmin(req);

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hanya Admin yang dapat membuat kegiatan baru' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, date, category } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: 'Title and date are required' }, { status: 400 });
    }

    const [yStr, mStr] = date.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const quarter = getQuarterFromMonth(month);

    const activity: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      date,
      year,
      quarter,
      category: (category as ArchiveCategory) || 'documentation',
      createdBy: session?.email || 'admin@gmahk-galilea.org',
      createdAt: new Date().toISOString(),
    };

    await createActivity(activity);

    await logSystemEvent({
      type: 'AUTH',
      message: `Kegiatan baru dibuat: "${title}" untuk Triwulan ${quarter} ${year}`,
      userId: session?.uid,
    });

    return NextResponse.json({
      success: true,
      message: 'Kegiatan berhasil ditambahkan',
      data: activity,
    });
  } catch (error) {
    console.error('API create activity error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
