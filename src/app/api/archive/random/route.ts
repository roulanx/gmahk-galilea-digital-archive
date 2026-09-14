import { NextRequest, NextResponse } from 'next/server';
import { getRandomArchiveSample } from '@/lib/firestore';
import { getRandomFilesFromDrive } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get('count') || '6', 10);

    let randomItems = await getRandomArchiveSample(count);
    if (!randomItems || randomItems.length === 0) {
      randomItems = []; // No fallback to global drive
    }

    return NextResponse.json({
      success: true,
      data: randomItems,
    });
  } catch (error) {
    console.error('API Random archive error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch random archive' }, { status: 500 });
  }
}
