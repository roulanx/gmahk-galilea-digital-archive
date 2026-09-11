import { NextRequest, NextResponse } from 'next/server';
import { getSabbathsInQuarter, getQuarterTitle } from '@/lib/sabbath';
import { getFilesBySabbath } from '@/lib/firestore';
import { ArchiveCategory, FileItem } from '@/lib/types';



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || '2026', 10);
    const quarter = parseInt(searchParams.get('quarter') || '3', 10);
    const sabbathDate = searchParams.get('sabbath'); // optional YYYY-MM-DD
    const category = searchParams.get('category') as ArchiveCategory | undefined;

    const availableYears = [2026, 2027];
    const quarters = [1, 2, 3, 4].map((q) => ({
      quarter: q,
      title: getQuarterTitle(q),
    }));

    const sabbaths = getSabbathsInQuarter(year, quarter);

    // If specific Sabbath is requested, return files for that Sabbath
    let files: FileItem[] = [];
    const activeSabbath = sabbathDate || (sabbaths.length > 0 ? sabbaths[0].date : '');
    if (activeSabbath) {
      files = await getFilesBySabbath(activeSabbath, category);
    }

    return NextResponse.json({
      success: true,
      data: {
        availableYears,
        selectedYear: year,
        quarters,
        selectedQuarter: quarter,
        sabbaths,
        selectedSabbath: activeSabbath,
        files,
      },
    });
  } catch (error) {
    console.error('API Archive tree error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch archive tree' }, { status: 500 });
  }
}
