import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { getSystemLogs } from '@/lib/firestore';



export async function GET(req: NextRequest) {
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
        { success: false, error: 'Forbidden: Hanya Admin yang dapat melihat log audit' },
        { status: 403 }
      );
    }

    const logs = await getSystemLogs(50);
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('API get logs error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
