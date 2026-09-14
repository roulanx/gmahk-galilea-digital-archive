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
      randomItems = await getRandomFilesFromDrive(count);
    } else if (randomItems.length < count) {
      const driveItems = await getRandomFilesFromDrive(count - randomItems.length);
      const existingIds = new Set(randomItems.map(i => i.id));
      for (const item of driveItems) {
        if (!existingIds.has(item.id)) {
          randomItems.push(item);
        }
      }
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
