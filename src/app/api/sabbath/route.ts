import { NextResponse } from 'next/server';
import { getCurrentQuarterInfo, getNextSabbath, getPreviousSabbath, getDefaultUploadSabbath } from '@/lib/sabbath';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const nextSabbath = getNextSabbath();
    const prevSabbath = getPreviousSabbath();
    const defaultUpload = getDefaultUploadSabbath();
    const quarterInfo = getCurrentQuarterInfo();

    return NextResponse.json({
      success: true,
      data: {
        nextSabbath,
        prevSabbath,
        defaultUpload,
        quarter: quarterInfo,
      },
    });
  } catch (error) {
    console.error('API Sabbath error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
