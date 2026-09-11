import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { runArchiveAutomation } from '@/lib/automation';
import { getAutomationStatus } from '@/lib/firestore';



export async function GET() {
  try {
    const status = await getAutomationStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('API get automation status error:', error);
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
        { success: false, error: 'Forbidden: Hanya Admin yang dapat menjalankan otomasi' },
        { status: 403 }
      );
    }

    const result = await runArchiveAutomation();

    return NextResponse.json({
      success: result.status === 'SUCCESS',
      message: result.details,
      data: result,
    });
  } catch (error) {
    console.error('API trigger automation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to run automation' }, { status: 500 });
  }
}
